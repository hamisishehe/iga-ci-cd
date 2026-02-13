package com.example.iga_veta.Service;

import com.example.iga_veta.Model.*;
import com.example.iga_veta.Model.Collections;
import com.example.iga_veta.Repository.*;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class CollectionService {

    private static final Logger log = LoggerFactory.getLogger(CollectionService.class);

    @Autowired private CustomerRepository customerRepository;
    @Autowired private CentreRepository centreRepository;
    @Autowired private Gfs_codeRepository gfsCodeRepository;
    @Autowired private CollectionRepository collectionsRepository;
    @Autowired private ZoneRepository zoneRepository;

    private final RestTemplate restTemplate;

    public CollectionService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    private static final String API_URL = "http://41.59.229.41:6092/api/collections/fetch";
    private static final String API_KEY = "Vj7k_Oc7Gm5j2QHqZJ3lJ4UrVzml8GoxT9CwpuG8OqY";

    public List<Collections> getAllCollections() {
        return collectionsRepository.findAll();
    }

    @Scheduled(fixedRate = 100000) // ~ every 100 seconds
    public void fetchDataPeriodically() {
        fetchDataFromApi();
    }

    @SuppressWarnings("unchecked")
    public void fetchDataFromApi() {

        LocalDateTime lastFetchedDateFromDb = collectionsRepository
                .findLastFetchedDate()
                .orElse(LocalDateTime.of(2025, 12, 31, 0, 0));

        DateTimeFormatter isoFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("lastFetchedDate", lastFetchedDateFromDb.format(isoFormatter));
        requestBody.put("apiKey", API_KEY);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        ResponseEntity<Map> response = restTemplate.postForEntity(API_URL, entity, Map.class);

        if (response.getBody() != null) {
            String responseBody = response.getBody().toString();
            int sizeInBytes = responseBody.getBytes(StandardCharsets.UTF_8).length;
            log.info("Response body size in bytes: {}", sizeInBytes);
        }

        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new RuntimeException("Failed to fetch data from API, status=" + response.getStatusCode());
        }

        Map<String, Object> responseMap = response.getBody();

        String lastFetchedDateStr = safeString(responseMap.get("lastFetchedDate"));
        LocalDateTime apiLastFetchedDate = parseDate(lastFetchedDateStr);

        List<Map<String, Object>> collections =
                (List<Map<String, Object>>) responseMap.get("collections");
        if (collections == null) collections = java.util.Collections.emptyList();

        log.info("Number of collection items returned by API: {}", collections.size());

        // Convert API data to list
        List<Map<String, String>> apiData = new ArrayList<>();
        for (Map<String, Object> item : collections) {
            Map<String, String> row = new HashMap<>();
            row.put("customerName", safeString(item.get("customerName")));
            row.put("gfsCode", safeString(item.get("gfsCode")));
            row.put("amountBilled", safeString(item.get("amountBilled")));
            row.put("amountPaid", safeString(item.get("amountPaid")));
            row.put("description", safeString(item.get("description")));
            row.put("centreName", safeString(item.get("centreName")));
            row.put("paymentType", safeString(item.get("paymentType")));

            // ✅ allow null controlNumber (DON'T force to something)
            row.put("controlNumber", safeString(item.get("controlNumber")));

            row.put("paymentDate", safeString(item.get("paymentDate")));
            apiData.add(row);
        }

        log.info("Number of rows prepared for insertion: {}", apiData.size());

        processApiData(apiData, apiLastFetchedDate);
    }

    private String safeString(Object obj) {
        if (obj == null) return null;
        String s = obj.toString().trim();
        return s.isEmpty() ? null : s;
    }

    private String safeTrim(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private BigDecimal parseBigDecimalOrNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        if (t.isEmpty()) return null;

        t = t.replace(",", "");

        try {
            return new BigDecimal(t);
        } catch (Exception e) {
            return null;
        }
    }

    private LocalDateTime parseDate(String dateStr) {
        if (dateStr == null || dateStr.isBlank()) return null;
        String t = dateStr.trim();
        try {
            return LocalDateTime.parse(t);
        } catch (Exception e) {
            try {
                DateTimeFormatter f = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
                return LocalDateTime.parse(t, f);
            } catch (Exception ex) {
                return null;
            }
        }
    }

    @Transactional
    public void processApiData(List<Map<String, String>> apiData, LocalDateTime apiLastFetchedDate) {

        int inserted = 0;
        int skippedMissingKey = 0;
        int skippedBadAmounts = 0;
        int skippedDuplicate = 0;

        for (Map<String, String> row : apiData) {

            String fullName = safeTrim(row.get("customerName"));
            String gfsCodeValue = safeTrim(row.get("gfsCode"));
            String centreName = safeTrim(row.get("centreName"));
            String description = safeTrim(row.get("description"));
            String controlNumber = safeTrim(row.get("controlNumber")); // ✅ can be null
            String paymentType = safeTrim(row.get("paymentType"));

            LocalDateTime date = parseDate(row.get("paymentDate"));

            BigDecimal amountBilled = parseBigDecimalOrNull(row.get("amountBilled"));
            BigDecimal amountPaid = parseBigDecimalOrNull(row.get("amountPaid"));

            // ✅ Key checks (controlNumber is NO LONGER required)
            if (date == null || gfsCodeValue == null || centreName == null) {
                skippedMissingKey++;
                log.warn("SKIP(missing key) controlNumber={}, date={}, gfsCode={}, centreName={}, desc={}",
                        controlNumber, row.get("paymentDate"), gfsCodeValue, centreName, description);
                continue;
            }

            // ✅ Amount checks
            if (amountBilled == null || amountPaid == null) {
                skippedBadAmounts++;
                log.warn("SKIP(bad amount) controlNumber={}, billed={}, paid={}, desc={}",
                        controlNumber, row.get("amountBilled"), row.get("amountPaid"), description);
                continue;
            }

            // 1) Find or create Centre
            Centre centre = centreRepository.getCentreByName(centreName).orElseGet(() -> {
                Centre newCentre = new Centre();
                newCentre.setName(centreName);
                newCentre.setCode(UUID.randomUUID().toString().substring(0, 8));
                newCentre.setRank(Centre.Rank.A);

                String firstToken = (!centreName.isBlank()) ? centreName.split("\\s+")[0] : "";
                String zoneName = getZoneName(firstToken);

                Zone zone = zoneRepository.findOneByName(zoneName).orElseGet(() -> {
                    Zone newZone = new Zone();
                    newZone.setName(zoneName);
                    newZone.setCode(UUID.randomUUID().toString().substring(0, 8));
                    return zoneRepository.save(newZone);
                });

                newCentre.setZones(zone);
                return centreRepository.save(newCentre);
            });

            // 2) Find or create Customer
            String safeCustomerName = (fullName != null) ? fullName : "UNKNOWN";
            Customer customer = customerRepository
                    .findByNameAndCentre_Id(safeCustomerName, centre.getId())
                    .orElseGet(() -> {
                        Customer c = new Customer();
                        c.setName(safeCustomerName);

                        String emailName = (!safeCustomerName.isBlank())
                                ? safeCustomerName.replace(" ", ".").toLowerCase()
                                : "unknown";
                        c.setEmail(emailName + "@example.com");
                        c.setCentre(centre);
                        return customerRepository.save(c);
                    });

            // 3) Find or create GFS Code
            GfsCode gfsCode = gfsCodeRepository.findByCode(gfsCodeValue).orElseGet(() -> {
                GfsCode newCode = new GfsCode();
                newCode.setCode(gfsCodeValue);
                return gfsCodeRepository.save(newCode);
            });

            // ✅ 4) DEDUPE:
            // - if controlNumber exists, use original strong key
            // - if controlNumber is null, use a fallback key so you don't insert duplicates every cycle
            String safeDesc = (description != null) ? description : "";

            boolean exists;
            if (controlNumber != null) {
                exists = collectionsRepository
                        .existsByControlNumberAndGfsCode_CodeAndCentre_IdAndDateAndDescriptionAndAmountBilled(
                                controlNumber,
                                gfsCodeValue,
                                centre.getId(),
                                date,
                                safeDesc,
                                amountBilled
                        );
            } else {
                // fallback dedupe when controlNumber is NULL
                // Using: customer + gfs + centre + date + desc + billed + paid
                exists = collectionsRepository
                        .existsByCustomer_NameAndGfsCode_CodeAndCentre_IdAndDateAndDescriptionAndAmountBilledAndAmountPaid(
                                safeCustomerName,
                                gfsCodeValue,
                                centre.getId(),
                                date,
                                safeDesc,
                                amountBilled,
                                amountPaid
                        );
            }

            if (exists) {
                skippedDuplicate++;
                continue;
            }

            // 5) Save Collection
            Collections collection = new Collections();
            collection.setCustomer(customer);
            collection.setCentre(centre);
            collection.setGfsCode(gfsCode);

            collection.setPaymentType(paymentType);

            // ✅ keep null in DB (allowed)
            collection.setControlNumber(controlNumber);

            collection.setDescription(description);

            collection.setAmountBilled(amountBilled);
            collection.setAmountPaid(amountPaid);

            collection.setLastFetched(apiLastFetchedDate);
            collection.setDate(date);

            collectionsRepository.save(collection);
            inserted++;
        }

        log.info("Process done. inserted={}, skippedMissingKey={}, skippedBadAmounts={}, skippedDuplicate={}",
                inserted, skippedMissingKey, skippedBadAmounts, skippedDuplicate);
    }

    private String getZoneName(String firstName) {
        if (firstName == null) return "HIGHLAND ZONE";
        String name = firstName.trim().toUpperCase();

        if (name.equals("DODOMA") || name.equals("SINDIDA") || name.equals("MANYARA"))
            return "CENTRAL ZONE";
        if (name.equals("MWANZA") || name.equals("MARA") || name.equals("KAGERA") || name.equals("GEITA"))
            return "LAKE ZONE";
        if (name.equals("MBEYA") || name.equals("RUKWA"))
            return "SOUTH WEST ZONE";
        if (name.equals("DAR"))
            return "DSM ZONE";
        if (name.equals("ARUSHA") || name.equals("TANGA"))
            return "NORTHERN ZONE";
        if (name.equals("KIGOMA") || name.equals("TABORA") || name.equals("SHINYANGA") || name.equals("SIMIYU"))
            return "WESTERN ZONE";
        if (name.equals("PWANI") || name.equals("KIHONDA") || name.equals("MIKUMI"))
            return "EASTERN ZONE";
        if (name.equals("MTWARA") || name.equals("LINDI"))
            return "SOUTH EAST ZONE";
        if (name.equals("IRINGA") || name.equals("NJOMBE") || name.equals("MIKUMI"))
            return "HIGHLAND ZONE";

        return "HIGHLAND ZONE";
    }

    public List<Collections> findAll() {
        return collectionsRepository.findAll();
    }

    public List<Collections> findAllData() {
        return collectionsRepository.findAll();
    }

    public List<Collections> findAllByCentre_Name(String centreName) {
        return collectionsRepository.findByCentreName(centreName);
    }

    public List<Collections> findAllByGfsCode_Name(String gfsCodeName) {
        return collectionsRepository.findCollectionsByGfsCode(gfsCodeName);
    }

    public BigDecimal findTotalAmountByGfsCode_Name(String gfsCodeName) {
        return collectionsRepository.getTotalAmountByGfsCode(gfsCodeName);
    }

    public BigDecimal getTotalAmountByCentreAndGfsCode(String gfsCodeName, String centreName) {
        return collectionsRepository.getTotalAmountByCentreAndGfsCode(centreName, gfsCodeName);
    }
}
