//package com.example.iga_veta.Controller;
//
//
//import com.example.iga_veta.Service.DashboardService;
//import lombok.RequiredArgsConstructor;
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.format.annotation.DateTimeFormat;
//import org.springframework.http.ResponseEntity;
//import org.springframework.web.bind.annotation.*;
//
//import java.time.LocalDate;
//import java.util.Map;
//
//
//
//@RestController
//@RequiredArgsConstructor
//@RequestMapping("/dashboard")
//public class DashboardController {
//
//
//    @Autowired
//    private  DashboardService dashboardService;
//
//
//
//    @PostMapping("/summary")
//    public ResponseEntity<Map<String, Object>> summary(@RequestBody Map<String, Object> body) {
//
//        System.out.println("SUMMARY BODY: " + body);
//
//        String fromDateStr = readFirst(body, "fromDate");
//        String toDateStr   = readFirst(body, "toDate");
//
//        // ✅ support both keys (frontend sometimes sends centreName / zoneName too)
//        String centre = readFirst(body, "centre", "centreName", "center");
//        String zone   = readFirst(body, "zone", "zoneName");
//
//        if (fromDateStr == null || toDateStr == null) {
//            return ResponseEntity.badRequest().body(Map.of(
//                    "error", "fromDate and toDate are required (YYYY-MM-DD)"
//            ));
//        }
//
//        LocalDate fromDate = LocalDate.parse(fromDateStr); // expects YYYY-MM-DD
//        LocalDate toDate   = LocalDate.parse(toDateStr);
//
//        // ✅ NEW: pass zone into service (this is what fixes Amount + Transactions)
//        return ResponseEntity.ok(dashboardService.summary(fromDate, toDate, centre, zone));
//    }
//
//}
