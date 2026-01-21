package com.example.iga_veta.Model;


import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
@Table(name = "distribution_formula")
public class DistributionFormula {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    @Lob
    private String expression;

    @ManyToOne
    @JoinColumn(name = "gfs_code_id", nullable = false)
    private GfsCode gfsCode;

    @ManyToOne
    @JoinColumn(name = "system_config_id", nullable = false)
    private SystemConfig system_config;
}
