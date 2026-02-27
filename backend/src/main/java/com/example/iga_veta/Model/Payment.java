package com.example.iga_veta.Model;

import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "payments",
        indexes = {
                @Index(name = "idx_payments_date", columnList = "payment_date"),
                @Index(name = "idx_payments_centre", columnList = "centre_id"),
                @Index(name = "idx_payments_control", columnList = "control_number")
        },
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_payments_payment_id", columnNames = {"payment_id"})
        }
)
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name="payment_id", nullable=false)
    private Long paymentId;

    @ManyToOne(optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @ManyToOne(optional = false)
    @JoinColumn(name="centre_id", nullable=false)
    private Centre centre;

    @ManyToOne
    @JoinColumn(name = "gfs_code_id")
    private GfsCode gfsCode;

    @Column(name="control_number", length=60)
    private String controlNumber;

    @Column(name="payment_type", length=120)
    private String paymentType;

    @Column(name="description", nullable=false, length=255)
    private String description = "";

    @Column(name="total_billed", nullable=false, precision=12, scale=2)
    private BigDecimal totalBilled = BigDecimal.ZERO;

    @Column(name="total_paid", nullable=false, precision=12, scale=2)
    private BigDecimal totalPaid = BigDecimal.ZERO;

    @Column(name="payment_date", nullable=false)
    private LocalDateTime paymentDate;

    @Column(name="last_fetched")
    private LocalDateTime lastFetched;

    @Column(name="created_at", updatable=false)
    private LocalDateTime createdAt;

    @Column(name="updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        if (description == null) description = "";
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() {
        if (description == null) description = "";
        updatedAt = LocalDateTime.now();
    }
}