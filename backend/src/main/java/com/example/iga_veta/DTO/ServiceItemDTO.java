package com.example.iga_veta.DTO;

import jakarta.persistence.Column;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class ServiceItemDTO {
    private Long id;
    private String serviceName;
    private BigDecimal serviceReturnProfit;
    private BigDecimal executors;
    private BigDecimal supporters_to_executors;
    private BigDecimal agency_fee;
    private BigDecimal amount_paid_to_paid;
    private LocalDateTime createdAt;
}