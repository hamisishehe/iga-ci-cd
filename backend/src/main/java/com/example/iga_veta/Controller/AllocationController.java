package com.example.iga_veta.Controller;


import com.example.iga_veta.Model.Allocation;
import com.example.iga_veta.Model.ApiUsage;
import com.example.iga_veta.Model.Collections;
import com.example.iga_veta.Repository.AllocationRepository;
import com.example.iga_veta.Repository.ApiUsageRepository;
import com.example.iga_veta.Repository.CollectionRepository;
import com.example.iga_veta.Service.AllocationService;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
@RestController
@RequestMapping("api/allocation")
public class AllocationController {

    @Autowired
    private AllocationService allocationService;

    @Autowired
    private CollectionRepository collectionsRepository;

    @Autowired
    private AllocationRepository allocationRepository;

    @Autowired
    private ApiUsageRepository apiUsageRepository;

    @Data
    public static class DateRangeRequest {
        private LocalDate startDate;
        private LocalDate endDate;
    }

    @PostMapping("/all-centres")
    public List<Allocation> getAllAllocations(@RequestBody DateRangeRequest request) {
        trackUsage("/all-centres", "POST");

        LocalDateTime start = request.getStartDate().atStartOfDay();
        LocalDateTime end = request.getEndDate().atTime(23, 59, 59);
        List<Collections> allCollections = collectionsRepository.findAll();
        return allocationService.allocateAllCentres(allCollections,start,end);
    }

    @PostMapping("/get")
    public List<Allocation> getAllocations(@RequestBody DateRangeRequest request) {
        trackUsage("/get", "POST");

        LocalDateTime start = request.getStartDate().atStartOfDay();
        LocalDateTime end = request.getEndDate().atTime(23, 59, 59);
        return allocationRepository.findByDateBetween(start, end);
    }

    // ----------------------------
    // Helper method to track usage
    private void trackUsage(String endpoint, String method) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String username = (auth != null && auth.isAuthenticated()) ? auth.getName() : "anonymous";

            ApiUsage usage = new ApiUsage();
            usage.setUsername(username);
            usage.setEndpoint("/api/allocation" + endpoint);
            usage.setMethod(method);
            usage.setTimestamp(LocalDateTime.now());

            apiUsageRepository.save(usage);
        } catch (Exception e) {
            e.printStackTrace(); // Logging failure should not break the request
        }
    }
}
