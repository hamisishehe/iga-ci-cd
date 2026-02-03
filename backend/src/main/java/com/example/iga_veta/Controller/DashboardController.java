package com.example.iga_veta.Controller;


import com.example.iga_veta.Service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;



@RestController
@RequiredArgsConstructor
@RequestMapping("/dashboard")
public class DashboardController {


    @Autowired
    private  DashboardService dashboardService;



    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> summary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) String centre
    ) {
        return ResponseEntity.ok(dashboardService.summary(fromDate, toDate, centre));
    }
}
