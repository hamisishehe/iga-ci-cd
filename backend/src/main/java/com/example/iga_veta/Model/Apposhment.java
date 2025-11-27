package com.example.iga_veta.Model;


import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Entity
@Table(name = "apposhment")
public class Apposhment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDate start_date;

    @Column(nullable = false)
    private LocalDate end_date;

    @OneToMany(mappedBy = "apposhments")
    @JsonIgnore
    private List<ApposhmentDistribution> apposhments;

    @OneToMany(mappedBy = "apposhment", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ServiceItem> services;


    @ManyToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "centre_id", nullable = false)
    private Centre centres;


    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }






}
