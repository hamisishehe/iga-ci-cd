package com.example.iga_veta.Model;


import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Entity
@Table(name = "apposhment_distribution")
public class ApposhmentDistribution {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "apposhment_id", nullable = false)
    private Apposhment apposhments;

    private String name;

    private String description;

    private BigDecimal amount;


}
