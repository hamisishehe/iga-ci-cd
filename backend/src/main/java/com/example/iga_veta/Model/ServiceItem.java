package com.example.iga_veta.Model;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "service_item")
public class ServiceItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String service_name;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal service_return_profit;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal executors;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal supporters_to_executors;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal agency_fee;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount_paid_to_paid;

    @ManyToOne
    @JoinColumn(name = "apposhment_id")
    private Apposhment apposhment;

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
