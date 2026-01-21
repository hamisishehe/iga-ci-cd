package com.example.iga_veta.Model;


import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Data
@Table(
        name = "collections",
        indexes = {
                // Date filtering (today / month)
                @Index(name = "idx_collections_date", columnList = "date"),

                // Center-based filtering (accountant / chief accountant)
                @Index(name = "idx_collections_centre", columnList = "centre_id"),

                // Service / GFS code aggregation
                @Index(name = "idx_collections_gfs_code", columnList = "gfs_code_id"),

                // MOST IMPORTANT: center + date (dashboard queries)
                @Index(name = "idx_collections_centre_date", columnList = "centre_id, date")
        }
)
public class Collections {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @ManyToOne
    @JoinColumn(name="centre_id", nullable=false)
    private Centre centre;

    @ManyToOne
    @JoinColumn(name = "gfs_code_id", nullable = false)
    private GfsCode gfsCode;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    private String description;

    @Column(nullable = false)
    private String controlNumber;

    @Column(columnDefinition = "TIMESTAMP")
    private LocalDateTime last_fetched;

    @Column(nullable = false)
    private LocalDateTime date;

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
