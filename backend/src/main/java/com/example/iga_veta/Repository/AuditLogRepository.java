package com.example.iga_veta.Repository;

import com.example.iga_veta.Model.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog,Long> {

    List<AuditLog> findByUsersId(Long userId);

    // Optional: Find logs by action
    List<AuditLog> findByActionContainingIgnoreCase(String action);

}
