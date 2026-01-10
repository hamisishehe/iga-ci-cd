package com.example.iga_veta.Service;

import com.example.iga_veta.DTO.AuditLogDTO;
import com.example.iga_veta.Model.AuditLog;
import com.example.iga_veta.Repository.AuditLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class AuditLogService {

    @Autowired
    private AuditLogRepository auditLogRepository;

    public List<AuditLogDTO> getAllAuditLogs() {
        return auditLogRepository.findAll()
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    private AuditLogDTO mapToDto(AuditLog auditLog) {
        AuditLogDTO dto = new AuditLogDTO();
        dto.setId(auditLog.getId());
        dto.setAction(auditLog.getAction());
        dto.setObjectType(auditLog.getObjectType());
        dto.setObjectId(auditLog.getObjectId());
        dto.setIpAddress(auditLog.getIpAddress());
        dto.setUserAgent(auditLog.getUserAgent());
        dto.setCreatedAt(auditLog.getCreatedAt());
        dto.setUpdatedAt(auditLog.getUpdatedAt());

        if (auditLog.getUsers() != null) {
            dto.setUserId(auditLog.getUsers().getId());
            dto.setUsername(auditLog.getUsers().getFirstName() + " " + auditLog.getUsers().getLastName() );
        }

        return dto;
    }
}
