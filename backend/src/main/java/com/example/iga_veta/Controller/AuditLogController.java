package com.example.iga_veta.Controller;


import com.example.iga_veta.DTO.AuditLogDTO;
import com.example.iga_veta.Model.AuditLog;
import com.example.iga_veta.Service.AuditLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/audit_logs")
public class AuditLogController {


    @Autowired
    private AuditLogService auditLogService;

    @GetMapping("getall")
    public List<AuditLogDTO> getAuditLogs() {
        return auditLogService.getAllAuditLogs();
    }



}
