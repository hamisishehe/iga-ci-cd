package com.example.iga_veta.dto;

import lombok.Data;

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
