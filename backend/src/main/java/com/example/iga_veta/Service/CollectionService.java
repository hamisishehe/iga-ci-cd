package com.example.iga_veta.Service;

import com.example.iga_veta.Model.*;
import com.example.iga_veta.Model.Collections;
import com.example.iga_veta.Repository.*;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class CollectionService {

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private CentreRepository centreRepository;

    @Autowired
    private Gfs_codeRepository gfsCodeRepository;

    @Autowired
    private CollectionRepository collectionsRepository;

    @Autowired
    private ZoneRepository zoneRepository;

    private final RestTemplate restTemplate;

    public CollectionService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }



    private static final String API_URL = "http://41.59.229.41:6092/api/collections/fetch";


    public List<Collections> getAllCollections() {
        return collectionsRepository.findAll();
    }

    @Scheduled(fixedRate = 10000) // every 60 seconds
    public void fetchDataPeriodically() {
        fetchDataFromApi();
    }

    public void fetchDataFromApi() {

        // Get last fetched date from DB (or fallback)
        LocalDateTime lastFetchedDateFromDb = collectionsRepository
                .findLastFetchedDate()
                .orElse(LocalDateTime.of(2000, 1, 1, 0, 0));

        DateTimeFormatter isoFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

        // Build request payload
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("lastFetchedDate", lastFetchedDateFromDb.format(isoFormatter));
        requestBody.put("apiKey", "Vj7k_Oc7Gm5j2QHqZJ3lJ4UrVzml8GoxT9CwpuG8OqY");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        // Make API request
        ResponseEntity<Map> response = restTemplate.postForEntity(API_URL, entity, Map.class);

        if (response.getBody() != null) {
            String responseBody = response.getBody().toString();
            int sizeInBytes = responseBody.getBytes(StandardCharsets.UTF_8).length;
            System.out.println("Response body size in bytes: " + sizeInBytes);
        }

        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new RuntimeException("Failed to fetch data from API");
        }

        Map<String, Object> responseMap = response.getBody();

        // Extract lastFetchedDate from API response
        String lastFetchedDateStr = (String) responseMap.get("lastFetchedDate");
        LocalDateTime apiLastFetchedDate = LocalDateTime.parse(lastFetchedDateStr);

        // Extract collections
        List<Map<String, Object>> collections = (List<Map<String, Object>>) responseMap.get("collections");

        int apiItemsCount = collections.size();
        System.out.println("Number of collection items returned by API: " + apiItemsCount);

        // Convert API data to list
        List<Map<String, String>> apiData = new ArrayList<>();
        for (Map<String, Object> item : collections) {
            Map<String, String> row = new HashMap<>();
            row.put("customerName", safeString(item.get("customerName")));
            row.put("gfsCode", safeString(item.get("gfsCode")));           // ✅ service code
            row.put("amountPaid", safeString(item.get("amountBilled")));
            row.put("description", safeString(item.get("description")));   // ✅ service name/description
            row.put("centreName", safeString(item.get("centreName")));
            row.put("controlNumber", safeString(item.get("controlNumber")));
            row.put("paymentDate", safeString(item.get("paymentDate")));
            apiData.add(row);
        }

        System.out.println("Number of rows prepared for insertion: " + apiData.size());

        // Process API data
        processApiData(apiData, apiLastFetchedDate);
    }

    // ✅ FIX: return null for missing/blank values (not "")
    private String safeString(Object obj) {
        if (obj == null) return null;
        String s = obj.toString().trim();
        return s.isEmpty() ? null : s;
    }

    @Transactional
    public void processApiData(List<Map<String, String>> apiData, LocalDateTime apiLastFetchedDate) {

        for (Map<String, String> row : apiData) {

            String fullName = row.get("customerName") != null ? row.get("customerName").trim() : "";
            String gfsCodeValue = row.get("gfsCode") != null ? row.get("gfsCode").trim() : "";
            BigDecimal amount = new BigDecimal(row.get("amountPaid") != null ? row.get("amountPaid") : "0");

            String centreName = row.get("centreName") != null ? row.get("centreName").trim() : "";
            String description = row.get("description") != null ? row.get("description").trim() : "";

            String controlNumber = row.get("controlNumber") != null ? row.get("controlNumber").trim() : null;
            LocalDateTime date = parseDate(row.get("paymentDate"));

            // ✅ DB requires controlNumber and date (avoid bad inserts)
            if (controlNumber == null || controlNumber.isBlank() || date == null) {
                continue;
            }

            // 1️⃣ Find or create Centre
            Centre centre = centreRepository.getCentreByName(centreName).orElseGet(() -> {
                Centre newCentre = new Centre();
                newCentre.setName(centreName);
                newCentre.setCode(UUID.randomUUID().toString().substring(0, 8));
                newCentre.setRank(Centre.Rank.A);

                String zoneName = getZoneName(centreName.split(" ")[0]);

                Zone zone = zoneRepository.findOneByName(zoneName).orElseGet(() -> {
                    Zone newZone = new Zone();
                    newZone.setName(zoneName);
                    newZone.setCode(UUID.randomUUID().toString().substring(0, 8));
                    return zoneRepository.save(newZone);
                });

                newCentre.setZones(zone);
                return centreRepository.save(newCentre);
            });

            // 2️⃣ Find or create Customer ✅ (NO duplicate customers)
            // 2️⃣ Find or create Customer
            Customer customer = new Customer();
            customer.setName(fullName);
            customer.setEmail(fullName.replace(" ", ".").toLowerCase() + "@example.com");
            customer.setCentre(centre);
            customer = customerRepository.save(customer);



            // 3️⃣ Validate GFS Code ✅ (service code)
            GfsCode gfsCode = gfsCodeRepository.findByCode(gfsCodeValue).orElseGet(() -> {
                GfsCode newCode = new GfsCode();
                newCode.setCode(gfsCodeValue);
                return gfsCodeRepository.save(newCode);
            });

//            // Adjustments
//            if (controlNumber != null && "142202540053".equals(gfsCode.getCode())
//                    && amount.compareTo(new BigDecimal("5000")) >= 0) {
//                amount = new BigDecimal("5000");
//            }
//
//            if (controlNumber != null && "142301600001".equals(gfsCode.getCode())
//                    && amount.compareTo(new BigDecimal("5000")) >= 0) {
//                amount = amount.subtract(new BigDecimal("5000"));
//            }

            // 4️⃣ ✅ DEDUPE CHECK (NO duplicate collections)
            boolean exists = collectionsRepository
                    .existsByControlNumberAndGfsCode_CodeAndCentre_IdAndDateAndAmount(
                            controlNumber,
                            gfsCodeValue,
                            centre.getId(),
                            date,
                            amount
                    );

            if (exists) {
                continue;
            }

            // 5️⃣ Save Collection ✅ (keeps serviceCode + serviceName)
            Collections collection = new Collections();
            collection.setCustomer(customer);
            collection.setCentre(centre);
            collection.setGfsCode(gfsCode);                 // ✅ service code
            collection.setControlNumber(controlNumber);
            collection.setDescription(description);         // ✅ service name
            collection.setAmount(amount);
            collection.setLast_fetched(apiLastFetchedDate);
            collection.setDate(date);

            collectionsRepository.save(collection);
        }
    }

    private String getZoneName(String firstName) {
        if (firstName.equals("DODOMA") || firstName.equals("SINDIDA") || firstName.equals("MANYARA"))
            return "CENTRAL ZONE";
        if (firstName.equals("Mwanza") || firstName.equals("Mara") || firstName.equals("KAGERA") || firstName.equals("GEITA"))
            return "LAKE ZONE";
        if (firstName.equals("Mbeya") || firstName.equals("Rukwa"))
            return "SOUTH WEST ZONE";
        if (firstName.equals("DAR"))
            return "DSM ZONE";
        if (firstName.equals("ARUSHA") || firstName.equals("Tanga"))
            return "NORTHERN ZONE";
        if (firstName.equals("Kigoma") || firstName.equals("Tabora") || firstName.equals("Shinyanga") || firstName.equals("Simiyu"))
            return "WESTERN ZONE";
        if (firstName.equals("Pwani") || firstName.equals("Kihonda") || firstName.equals("Mikumi"))
            return "EASTERN ZONE";
        if (firstName.equals("Mtwara") || firstName.equals("LINDI"))
            return "SOUTH EAST ZONE";
        if (firstName.equals("Iringa") || firstName.equals("Njombe") || firstName.equals("Mikumi"))
            return "HIGHLAND ZONE";

        return "HIGHLAND ZONE";
    }

    private LocalDateTime parseDate(String dateStr) {
        if (dateStr == null || dateStr.isEmpty()) return null;
        return LocalDateTime.parse(dateStr);
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
