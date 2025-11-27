package com.example.iga_veta.Controller;


import com.example.iga_veta.Model.Allocation;
import com.example.iga_veta.Model.Collections;
import com.example.iga_veta.Repository.AllocationRepository;
import com.example.iga_veta.Repository.CollectionRepository;
import com.example.iga_veta.Service.AllocationService;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
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


    @Data
    public static class DateRangeRequest {
        private LocalDate startDate;
        private LocalDate endDate;
    }

    @PostMapping("/all-centres")
    public List<Allocation> getAllAllocations(@RequestBody DateRangeRequest request) {
        LocalDateTime start = request.getStartDate().atStartOfDay();
        LocalDateTime end = request.getEndDate().atTime(23, 59, 59);
        List<Collections> allCollections = collectionsRepository.findAll();
        return allocationService.allocateAllCentres(allCollections,start,end);
    }



    @PostMapping("/get")
    public List<Allocation> getAllocations(@RequestBody DateRangeRequest request) {
        LocalDateTime start = request.getStartDate().atStartOfDay();
        LocalDateTime end = request.getEndDate().atTime(23, 59, 59);
        return allocationRepository.findByDateBetween(start, end);
    }
}
