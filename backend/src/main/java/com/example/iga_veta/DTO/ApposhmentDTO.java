package com.example.iga_veta.DTO;

import com.example.iga_veta.DTO.ServiceItemDTO;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class ApposhmentDTO {
    private Long id;
    private LocalDate startDate;
    private LocalDate endDate;
    private CentreDTO centre;
    private List<ServiceItemDTO> services;
}
