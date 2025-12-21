package com.example.iga_veta.Controller;


import com.example.iga_veta.DTO.ApposhmentDistributionDTO;
import com.example.iga_veta.Model.Allocation;
import com.example.iga_veta.Model.ApiUsage;
import com.example.iga_veta.Model.ApposhmentDistribution;
import com.example.iga_veta.Model.Collections;
import com.example.iga_veta.Repository.ApiUsageRepository;
import com.example.iga_veta.Service.ApposhmentDistributionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("api/apposhment_distribution")
public class ApposhmentDistributionController {

    @Autowired
    private ApposhmentDistributionService apposhmentDistributionService;

    @Autowired
    private ApiUsageRepository apiUsageRepository;




    @PostMapping("/save")
    public String saveApposhmentDistribution(@RequestBody Map<String, String> body) {

            trackUsage("/save", "POST");

        System.out.println(body);

        BigDecimal amount = body.get("amount") == null ? BigDecimal.ZERO : new BigDecimal(body.get("amount"));
        String description = body.getOrDefault("description", "");
        String service_name = body.getOrDefault("service_name", "");
        Long apposhment_id = body.getOrDefault("apposhment_id", "0").equals("0") ? null : Long.valueOf(body.get("apposhment_id"));


        return apposhmentDistributionService.saveApposhmentDistribution(description,amount,service_name, apposhment_id);
    }


    @GetMapping("/get/{apposhment_id}")
    public List<ApposhmentDistributionDTO> getAll(

            @PathVariable("apposhment_id") Long apposhmentId) {
        trackUsage("/id", "GET");

        return apposhmentDistributionService.getAllApposhmentDistributions(apposhmentId);
    }


    private void trackUsage(String endpoint, String method) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String username = (auth != null && auth.isAuthenticated()) ? auth.getName() : "anonymous";

            ApiUsage usage = new ApiUsage();
            usage.setUsername(username);
            usage.setEndpoint("/api/apposhment_distribution" + endpoint);
            usage.setMethod(method);
            usage.setTimestamp(LocalDateTime.now());

            apiUsageRepository.save(usage);
        } catch (Exception e) {
            e.printStackTrace(); // Logging failure should not break the request
        }
    }



}
