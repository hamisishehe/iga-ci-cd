package com.example.iga_veta.Controller;

import com.example.iga_veta.DTO.ApposhmentDTO;
import com.example.iga_veta.Model.ApiUsage;
import com.example.iga_veta.Model.Apposhment;
import com.example.iga_veta.Model.ServiceRequest;
import com.example.iga_veta.Repository.ApiUsageRepository;
import com.example.iga_veta.Service.ApposhmentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("api/apposhments")
public class ApposhmentController {

    private final ApposhmentService apposhmentService;

    public ApposhmentController(ApposhmentService apposhmentService) {
        this.apposhmentService = apposhmentService;
    }

    @Autowired
    private ApiUsageRepository apiUsageRepository;

    // Save new
    @PostMapping("/save")
    public ResponseEntity<String> saveMultiple(@RequestBody Map<String, Object> body) {
        trackUsage("/save", "GET");

            Long centreId = Long.valueOf(body.get("centre_id").toString());
            LocalDate startDate = LocalDate.parse(body.get("start_date").toString());
            LocalDate endDate = LocalDate.parse(body.get("end_date").toString());

            @SuppressWarnings("unchecked")
            List<Map<String, String>> servicesMap = (List<Map<String, String>>) body.get("services");

            // Map JSON to ServiceRequest DTO
            List<ServiceRequest> services = servicesMap.stream().map(s -> {
                ServiceRequest sr = new ServiceRequest();
                sr.setService_name(s.get("service_name"));
                sr.setService_return_profit(Double.valueOf(s.get("service_return_profit")));
                return sr;
            }).toList();

            // Call service method once with all services
            String response = apposhmentService.saveApposhment(centreId, startDate, endDate, services);

            return ResponseEntity.ok(response);


    }


    // Get all
    @GetMapping("/all")
    public List<ApposhmentDTO> getAllApposhmentsWithServices() {
        trackUsage("/all", "GET");
        return apposhmentService.getAllApposhmentsWithServices();
    }

    // Get by id
    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        trackUsage("/id", "GET");
        return apposhmentService.getApposhmentById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/apposhment/{id}")
    public ResponseEntity<?> getByCentreId(@PathVariable Long id) {
        trackUsage("/id", "GET");
        return apposhmentService.getApposhmentById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    private void trackUsage(String endpoint, String method) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String username = (auth != null && auth.isAuthenticated()) ? auth.getName() : "anonymous";

            ApiUsage usage = new ApiUsage();
            usage.setUsername(username);
            usage.setEndpoint("/api/apposhments" + endpoint);
            usage.setMethod(method);
            usage.setTimestamp(LocalDateTime.now());

            apiUsageRepository.save(usage);
        } catch (Exception e) {
            e.printStackTrace(); // Logging failure should not break the request
        }
    }

}
