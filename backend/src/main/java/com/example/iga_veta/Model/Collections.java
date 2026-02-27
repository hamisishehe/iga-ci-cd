package com.example.iga_veta.Model;

import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Data
@Table(
        name = "collections",
        indexes = {
                @Index(name = "idx_collections_date", columnList = "date"),
                @Index(name = "idx_collections_centre", columnList = "centre_id"),
                @Index(name = "idx_collections_gfs_code", columnList = "gfs_code_id"),
                @Index(name = "idx_collections_centre_date", columnList = "centre_id, date"),

                @Index(name = "idx_collections_control_number", columnList = "control_number"),
                @Index(name = "idx_collections_control_date", columnList = "control_number, date"),

                @Index(name = "idx_collections_payment_id", columnList = "payment_id"),

                // helpful for dedupe lookups (optional)
                @Index(name = "idx_collections_dedupe_lookup",
                        columnList = "control_number, gfs_code_id, centre_id, date, amount_billed, description")
        },
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_collections_payment_bill", columnNames = {"payment_id", "bill_id"})
        }
)
public class Collections {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @ManyToOne(optional = false)
    @JoinColumn(name="centre_id", nullable=false)
    private Centre centre;

    @ManyToOne(optional = false)
    @JoinColumn(name = "gfs_code_id", nullable = false)
    private GfsCode gfsCode;

    @Column(name = "amount_billed", nullable = false, precision = 12, scale = 2)
    private BigDecimal amountBilled;

    @Column(name = "amount_paid", precision = 12, scale = 2)
    private BigDecimal amountPaid;

    @Column(name = "description", nullable = false, length = 255)
    private String description = "";

    @Column(name = "payment_type", length = 120)
    private String paymentType;

    @Column(name = "control_number", nullable = true, length = 60)
    private String controlNumber;

    @Column(name = "last_fetched", columnDefinition = "TIMESTAMP")
    private LocalDateTime lastFetched;

    @Column(nullable = false)
    private LocalDateTime date;

    @Column(name = "bill_id")
    private Long billId;

    @Column(name = "payment_id")
    private Long paymentId;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (description == null) description = "";
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    protected void onUpdate() {
        if (description == null) description = "";
        updatedAt = LocalDateTime.now();
    }
}