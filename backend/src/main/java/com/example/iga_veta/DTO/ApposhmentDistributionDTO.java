package com.example.iga_veta.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApposhmentDistributionDTO {
    private Long id;
    private String description;
    private String service_name;
    private BigDecimal amount;
}
