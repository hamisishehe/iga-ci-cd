// ✅ FULL MODIFIED CODE (CollectionService.java)
// - Fixes missing transactions caused by date parsing (Z/+03:00/milliseconds)
// - Uses cursor based on MAX(paymentDate) not lastFetched (prevents cursor jumping forward)
// - Adds overlap window (minusMinutes) to avoid boundary misses
// - UPSERT behavior (updates existing rows instead of skipping when amountPaid changes)
// - Safer parsing for amounts like "null", "250,000.00", "250000 TSh" (keeps digits/dot/minus)

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
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.time.temporal.ChronoField;
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

    // ✅ flexible formatter supports:
    // 2026-01-21T05:48:18
    // 2026-01-21T05:48:18.123
    // 2026-01-21T05:48:18Z
    // 2026-01-21T05:48:18+03:00
    private static final DateTimeFormatter FLEX =
            new DateTimeFormatterBuilder()
                    .appendPattern("yyyy-MM-dd'T'HH:mm:ss")
                    .optionalStart()
                    .appendFraction(ChronoField.NANO_OF_SECOND, 1, 9, true)
                    .optionalEnd()
                    .optionalStart()
                    .appendOffsetId()
                    .optionalEnd()
                    .toFormatter();

    public List<Collections> getAllCollections() {
        return collectionsRepository.findAll();
    }

    @Scheduled(fixedRate = 100000)
    public void fetchDataPeriodically() {
        fetchDataFromApi();
    }

    @SuppressWarnings("unchecked")
    public void fetchDataFromApi() {

        // ✅ Use payment date cursor (MAX(date)) not lastFetched (prevents cursor jumping forward)
        LocalDateTime cursor = collectionsRepository
                .findMaxPaymentDate()
                .orElse(LocalDateTime.of(2025, 12, 31, 0, 0));

        // ✅ overlap window to avoid missing boundary records (same second / delayed API)
        cursor = cursor.minusMinutes(5);

        DateTimeFormatter iso = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("lastFetchedDate", cursor.format(iso));
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

        log.info("CursorSent={}, apiLastFetchedDate={}, API items={}", cursor, apiLastFetchedDate, collections.size());

        // ✅ Optional: show date range returned (helps debug missing rows)
        LocalDateTime min = null, max = null;
        int nullDates = 0;
        for (Map<String, Object> item : collections) {
            LocalDateTime d = parseDate(safeString(item.get("paymentDate")));
            if (d == null) { nullDates++; continue; }
            if (min == null || d.isBefore(min)) min = d;
            if (max == null || d.isAfter(max)) max = d;
        }
        log.info("API paymentDate range: min={}, max={}, nullDates={}", min, max, nullDates);

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

            // ✅ allow null controlNumber
            row.put("controlNumber", safeString(item.get("controlNumber")));

            row.put("paymentDate", safeString(item.get("paymentDate")));
            apiData.add(row);
        }

        log.info("Rows prepared for processing: {}", apiData.size());
        processApiData(apiData, apiLastFetchedDate);
    }

    private String safeString(Object obj) {
        if (obj == null) return null;
        String s = obj.toString().trim();
        if (s.isEmpty()) return null;
        if ("null".equalsIgnoreCase(s)) return null; // ✅ handle "null" string
        return s;
    }

    private String safeTrim(String s) {
        if (s == null) return null;
        String t = s.trim();
        if (t.isEmpty()) return null;
        if ("null".equalsIgnoreCase(t)) return null;
        return t;
    }

    // ✅ More tolerant amount parser (keeps digits, dot, minus)
    private BigDecimal parseBigDecimalOrNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        if (t.isEmpty() || "null".equalsIgnoreCase(t)) return null;

        // remove commas & any currency/text
        t = t.replace(",", "");
        t = t.replaceAll("[^0-9.\\-]", "");

        if (t.isEmpty() || "-".equals(t) || ".".equals(t)) return null;

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
            // if has offset or Z
            if (t.endsWith("Z") || t.matches(".*[+-]\\d\\d:\\d\\d$")) {
                return OffsetDateTime.parse(t, FLEX).toLocalDateTime();
            }
            return LocalDateTime.parse(t, FLEX);
        } catch (Exception e) {
            log.warn("Failed to parse paymentDate='{}'", t);
            return null;
        }
    }

    @Transactional
    public void processApiData(List<Map<String, String>> apiData, LocalDateTime apiLastFetchedDate) {

        int inserted = 0;
        int updated = 0;
        int skippedMissingKey = 0;
        int skippedBadAmounts = 0;
        int skippedNoChange = 0;

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

            // ✅ key checks (controlNumber not required)
            if (date == null || gfsCodeValue == null || centreName == null) {
                skippedMissingKey++;
                log.warn("SKIP(missing key) controlNumber={}, dateRaw={}, gfsCode={}, centreName={}, desc={}",
                        controlNumber, row.get("paymentDate"), gfsCodeValue, centreName, description);
                continue;
            }

            // ✅ amount checks
            if (amountBilled == null || amountPaid == null) {
                skippedBadAmounts++;
                log.warn("SKIP(bad amount) controlNumber={}, billedRaw={}, paidRaw={}, desc={}",
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

            // ✅ 4) UPSERT (update if exists, else insert)
            String safeDesc = (description != null) ? description : "";

            Optional<Collections> existingOpt;
            if (controlNumber != null) {
                // ✅ stable key: do NOT include amounts
                existingOpt = collectionsRepository
                        .findFirstByControlNumberAndGfsCode_CodeAndCentre_IdAndDateAndDescription(
                                controlNumber, gfsCodeValue, centre.getId(), date, safeDesc
                        );
            } else {
                existingOpt = collectionsRepository
                        .findFirstByCustomer_NameAndGfsCode_CodeAndCentre_IdAndDateAndDescription(
                                safeCustomerName, gfsCodeValue, centre.getId(), date, safeDesc
                        );
            }

            if (existingOpt.isPresent()) {
                Collections existing = existingOpt.get();

                boolean changed = false;

                if (existing.getAmountBilled() == null || existing.getAmountBilled().compareTo(amountBilled) != 0) {
                    existing.setAmountBilled(amountBilled);
                    changed = true;
                }
                if (existing.getAmountPaid() == null || existing.getAmountPaid().compareTo(amountPaid) != 0) {
                    existing.setAmountPaid(amountPaid);
                    changed = true;
                }
                if (!Objects.equals(existing.getPaymentType(), paymentType)) {
                    existing.setPaymentType(paymentType);
                    changed = true;
                }
                if (!Objects.equals(existing.getDescription(), description)) {
                    existing.setDescription(description);
                    changed = true;
                }
                if (!Objects.equals(existing.getControlNumber(), controlNumber)) {
                    existing.setControlNumber(controlNumber);
                    changed = true;
                }

                existing.setLastFetched(apiLastFetchedDate);

                if (changed) {
                    collectionsRepository.save(existing);
                    updated++;
                } else {
                    skippedNoChange++;
                }
                continue;
            }

            // 5) Insert new Collection
            Collections collection = new Collections();
            collection.setCustomer(customer);
            collection.setCentre(centre);
            collection.setGfsCode(gfsCode);

            collection.setPaymentType(paymentType);
            collection.setControlNumber(controlNumber); // ✅ keep null allowed
            collection.setDescription(description);

            collection.setAmountBilled(amountBilled);
            collection.setAmountPaid(amountPaid);

            collection.setLastFetched(apiLastFetchedDate);
            collection.setDate(date);

            collectionsRepository.save(collection);
            inserted++;
        }

        log.info("Process done. inserted={}, updated={}, skippedMissingKey={}, skippedBadAmounts={}, skippedNoChange={}",
                inserted, updated, skippedMissingKey, skippedBadAmounts, skippedNoChange);
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
