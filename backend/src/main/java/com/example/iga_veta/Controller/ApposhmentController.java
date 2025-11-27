package com.example.iga_veta.Controller;

import com.example.iga_veta.DTO.ApposhmentDTO;
import com.example.iga_veta.Model.Apposhment;
import com.example.iga_veta.Model.ServiceRequest;
import com.example.iga_veta.Service.ApposhmentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("api/apposhments")
public class ApposhmentController {

    private final ApposhmentService apposhmentService;

    public ApposhmentController(ApposhmentService apposhmentService) {
        this.apposhmentService = apposhmentService;
    }

    // Save new
    @PostMapping("/save")
    public ResponseEntity<String> saveMultiple(@RequestBody Map<String, Object> body) {
        try {
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

        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }


    // Get all
    @GetMapping("/all")
    public List<ApposhmentDTO> getAllApposhmentsWithServices() {
        return apposhmentService.getAllApposhmentsWithServices();
    }

    // Get by id
    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        return apposhmentService.getApposhmentById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/centre/{id}")
    public ResponseEntity<?> getByCentreId(@PathVariable Long id) {
        return apposhmentService.getApposhmentById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }


}
