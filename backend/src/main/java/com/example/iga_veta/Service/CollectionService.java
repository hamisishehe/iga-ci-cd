package com.example.iga_veta.Service;

import com.example.iga_veta.Model.*;
import com.example.iga_veta.Model.Collections;
import com.example.iga_veta.Repository.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private final CustomerRepository customerRepository;
    private final CentreRepository centreRepository;
    private final Gfs_codeRepository gfsCodeRepository;
    private final CollectionRepository collectionsRepository;
    private final PaymentRepository paymentRepository;
    private final ZoneRepository zoneRepository;
    private final RestTemplate restTemplate;

    @PersistenceContext
    private EntityManager em;

    public CollectionService(
            CustomerRepository customerRepository,
            CentreRepository centreRepository,
            Gfs_codeRepository gfsCodeRepository,
            CollectionRepository collectionsRepository,
            PaymentRepository paymentRepository,
            ZoneRepository zoneRepository,
            RestTemplate restTemplate
    ) {
        this.customerRepository = customerRepository;
        this.centreRepository = centreRepository;
        this.gfsCodeRepository = gfsCodeRepository;
        this.collectionsRepository = collectionsRepository;
        this.paymentRepository = paymentRepository;
        this.zoneRepository = zoneRepository;
        this.restTemplate = restTemplate;
    }

    private static final String API_URL = "http://41.59.229.41:6092/api/collections/fetch";
    private static final String API_KEY = "Vj7k_Oc7Gm5j2QHqZJ3lJ4UrVzml8GoxT9CwpuG8OqY";

    private static final Set<String> SPLIT_GFS = Set.of(
            "142202540053",
            "142301600001"
    );

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

    @Scheduled(fixedRate = 100000)
    public void fetchDataPeriodically() {
        fetchDataFromApi();
    }

    @SuppressWarnings("unchecked")
    public void fetchDataFromApi() {

        LocalDateTime cursor = paymentRepository
                .findMaxPaymentDate()
                .orElse(LocalDateTime.of(2025, 12, 31, 0, 0))
                .minusMinutes(5);

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

        LocalDateTime apiLastFetchedDate = parseDate(safeString(responseMap.get("lastFetchedDate")));
        if (apiLastFetchedDate == null) apiLastFetchedDate = LocalDateTime.now();

        List<Map<String, Object>> collections =
                (List<Map<String, Object>>) responseMap.get("collections");
        if (collections == null) collections = java.util.Collections.emptyList();

        log.info("CursorSent={}, apiLastFetchedDate={}, API items={}", cursor, apiLastFetchedDate, collections.size());

        List<Map<String, String>> apiData = new ArrayList<>(collections.size());
        for (Map<String, Object> item : collections) {
            Map<String, String> row = new HashMap<>();
            row.put("paymentId", safeString(item.get("paymentId")));
            row.put("billId", safeString(item.get("billId")));
            row.put("customerName", safeString(item.get("customerName")));
            row.put("gfsCode", safeString(item.get("gfsCode")));
            row.put("amountBilled", safeString(item.get("amountBilled")));
            row.put("amountPaid", safeString(item.get("amountPaid")));
            row.put("description", safeString(item.get("description")));
            row.put("centreName", safeString(item.get("centreName")));
            row.put("paymentType", safeString(item.get("paymentType")));
            row.put("controlNumber", safeString(item.get("controlNumber")));
            row.put("paymentDate", safeString(item.get("paymentDate")));
            apiData.add(row);
        }

        processApiData_GroupByPaymentId(apiData, apiLastFetchedDate);
    }

    private String safeString(Object obj) {
        if (obj == null) return null;
        String s = obj.toString().trim();
        if (s.isEmpty()) return null;
        if ("null".equalsIgnoreCase(s)) return null;
        return s;
    }

    private String safeTrim(String s) {
        if (s == null) return null;
        String t = s.trim();
        if (t.isEmpty()) return null;
        if ("null".equalsIgnoreCase(t)) return null;
        return t;
    }

    private BigDecimal parseBigDecimalOrZero(String s) {
        if (s == null) return BigDecimal.ZERO;

        String t = s.trim();
        if (t.isEmpty() || "null".equalsIgnoreCase(t)) return BigDecimal.ZERO;

        try {
            // Handle scientific notation correctly
            return new BigDecimal(t);
        } catch (NumberFormatException e) {
            try {
                // Remove commas ONLY (not other characters)
                t = t.replace(",", "");
                return new BigDecimal(t);
            } catch (Exception ex) {
                log.warn("Failed to parse amount: {}", s);
                return BigDecimal.ZERO;
            }
        }
    }

    private Long parseLongOrNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        if (t.isEmpty() || "null".equalsIgnoreCase(t)) return null;
        try { return Long.parseLong(t); }
        catch (Exception e) { return null; }
    }

    private LocalDateTime parseDate(String dateStr) {
        if (dateStr == null || dateStr.isBlank()) return null;
        String t = dateStr.trim();
        try {
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
    public void processApiData_GroupByPaymentId(List<Map<String, String>> apiData, LocalDateTime apiLastFetchedDate) {

        Map<String, Centre> centreCache = new HashMap<>();
        Map<String, GfsCode> gfsCache = new HashMap<>();
        Map<String, Customer> customerCache = new HashMap<>();

        Map<String, List<Map<String, String>>> grouped = new LinkedHashMap<>();
        List<Map<String, String>> noPaymentId = new ArrayList<>();

        for (Map<String, String> row : apiData) {
            Long paymentId = parseLongOrNull(row.get("paymentId"));
            if (paymentId == null) {
                noPaymentId.add(row);
                continue;
            }

            String gfsCodeValue = safeTrim(row.get("gfsCode"));
            boolean mustSplit = (gfsCodeValue != null && SPLIT_GFS.contains(gfsCodeValue));

            String groupKey = mustSplit
                    ? (paymentId + "|" + gfsCodeValue)
                    : String.valueOf(paymentId);

            grouped.computeIfAbsent(groupKey, k -> new ArrayList<>()).add(row);
        }

        int inserted = 0, updated = 0;
        final int BATCH = 200;

        for (Map.Entry<String, List<Map<String, String>>> entry : grouped.entrySet()) {
            List<Map<String, String>> lines = entry.getValue();
            if (lines == null || lines.isEmpty()) continue;

            Map<String, String> first = lines.get(0);

            Long paymentId = parseLongOrNull(first.get("paymentId"));
            if (paymentId == null) continue;

            String centreName = safeTrim(first.get("centreName"));
            String customerName = safeTrim(first.get("customerName"));
            String controlNumber = safeTrim(first.get("controlNumber"));
            String paymentType = safeTrim(first.get("paymentType"));
            String description = safeTrim(first.get("description"));
            String gfsCodeValue = safeTrim(first.get("gfsCode"));
            LocalDateTime paymentDate = parseDate(first.get("paymentDate"));

            if (centreName == null) centreName = "UNKNOWN CENTRE";
            if (customerName == null) customerName = "UNKNOWN";
            if (description == null) description = "";
            if (paymentDate == null) paymentDate = apiLastFetchedDate;

            String centreKey = centreName.toLowerCase(Locale.ROOT);
            Centre centre = centreCache.get(centreKey);
            if (centre == null) {
                String finalCentreName = centreName;
                centre = centreRepository.getCentreByName(finalCentreName).orElseGet(() -> {
                    Centre newCentre = new Centre();
                    newCentre.setName(finalCentreName);
                    newCentre.setCode(UUID.randomUUID().toString().substring(0, 8));
                    newCentre.setRank(Centre.Rank.A);

                    String firstToken = (!finalCentreName.isBlank()) ? finalCentreName.split("\\s+")[0] : "";
                    String zoneName = getZoneName(firstToken);

                    Zone zone = zoneRepository.findOneByName(zoneName).orElseGet(() -> {
                        Zone z = new Zone();
                        z.setName(zoneName);
                        z.setCode(UUID.randomUUID().toString().substring(0, 8));
                        return zoneRepository.save(z);
                    });

                    newCentre.setZones(zone);
                    return centreRepository.save(newCentre);
                });
                centreCache.put(centreKey, centre);
            }

            String customerKey = centre.getId() + "|" + customerName.toLowerCase(Locale.ROOT);
            Customer customer = customerCache.get(customerKey);
            if (customer == null) {
                String finalCustomerName = customerName;
                Centre finalCentre = centre;
                customer = customerRepository
                        .findByNameAndCentre_Id(finalCustomerName, centre.getId())
                        .orElseGet(() -> {
                            Customer c = new Customer();
                            c.setName(finalCustomerName);
                            String emailName = (!finalCustomerName.isBlank())
                                    ? finalCustomerName.replace(" ", ".").toLowerCase(Locale.ROOT)
                                    : "unknown";
                            c.setEmail(emailName + "@example.com");
                            c.setCentre(finalCentre);
                            return customerRepository.save(c);
                        });
                customerCache.put(customerKey, customer);
            }

            GfsCode gfs = null;
            if (gfsCodeValue != null) {
                gfs = gfsCache.get(gfsCodeValue);
                if (gfs == null) {
                    String finalCode = gfsCodeValue;
                    gfs = gfsCodeRepository.findByCode(finalCode).orElseGet(() -> {
                        GfsCode g = new GfsCode();
                        g.setCode(finalCode);
                        return gfsCodeRepository.save(g);
                    });
                    gfsCache.put(gfsCodeValue, gfs);
                }
            }

            BigDecimal totalBilled = BigDecimal.ZERO;
            BigDecimal totalPaid = BigDecimal.ZERO;
            for (Map<String, String> line : lines) {
                totalBilled = totalBilled.add(parseBigDecimalOrZero(line.get("amountBilled")));
                totalPaid = totalPaid.add(parseBigDecimalOrZero(line.get("amountPaid")));
            }

            // ✅ FIX: do NOT use getResultStream() (ResultSet closes)
            Payment pay;
            if (gfs != null) {
                List<Payment> found = em.createQuery(
                                "select p from Payment p where p.paymentId = :pid and p.gfsCode = :gfs",
                                Payment.class
                        )
                        .setParameter("pid", paymentId)
                        .setParameter("gfs", gfs)
                        .setMaxResults(1)
                        .getResultList();

                pay = found.isEmpty() ? null : found.get(0);
            } else {
                pay = paymentRepository.findByPaymentId(paymentId).orElse(null);
            }

            if (pay == null) {
                pay = new Payment();
                pay.setPaymentId(paymentId);
                inserted++;
            } else {
                updated++;
            }

            pay.setCentre(centre);
            pay.setCustomer(customer);
            pay.setGfsCode(gfs);
            pay.setControlNumber(controlNumber);
            pay.setPaymentType(paymentType);
            pay.setDescription(description);
            pay.setPaymentDate(paymentDate);
            pay.setTotalBilled(totalBilled);
            pay.setTotalPaid(totalPaid);
            pay.setLastFetched(apiLastFetchedDate);

            paymentRepository.save(pay);

            if ((inserted + updated) % BATCH == 0) {
                paymentRepository.flush();
                em.clear();
                log.info("Progress payments: inserted={}, updated={}, groups={}", inserted, updated, grouped.size());
            }
        }

        paymentRepository.flush();
        em.clear();

        log.info("DONE payments: inserted={}, updated={}, noPaymentIdRows={}",
                inserted, updated, noPaymentId.size());
    }

    private String getZoneName(String firstName) {
        if (firstName == null) return "HIGHLAND ZONE";
        String name = firstName.trim().toUpperCase(Locale.ROOT);

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

    public List<Collections> findAll() { return collectionsRepository.findAll(); }
    public List<Collections> findAllData() { return collectionsRepository.findAll(); }
    public List<Collections> findAllByCentre_Name(String centreName) { return collectionsRepository.findByCentreName(centreName); }
    public List<Collections> findAllByGfsCode_Name(String gfsCodeName) { return collectionsRepository.findCollectionsByGfsCode(gfsCodeName); }
    public BigDecimal findTotalAmountByGfsCode_Name(String gfsCodeName) { return collectionsRepository.getTotalAmountByGfsCode(gfsCodeName); }
    public BigDecimal getTotalAmountByCentreAndGfsCode(String gfsCodeName, String centreName) {
        return collectionsRepository.getTotalAmountByCentreAndGfsCode(centreName, gfsCodeName);
    }
}