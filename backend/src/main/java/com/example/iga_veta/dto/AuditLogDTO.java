package com.example.iga_veta.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class AuditLogDTO {

    private Long id;

    private String action;

    private String objectType;

    private Long objectId;

    private String ipAddress;

    private String userAgent;

    // Instead of User entity, expose only what you need
    private Long userId;
    private String username; // optional, remove if not needed

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
