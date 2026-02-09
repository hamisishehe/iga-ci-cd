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

                // ✅ Helpful for faster dedupe lookups after adding description
                @Index(name = "idx_collections_dedupe_lookup",
                        columnList = "control_number, gfs_code_id, centre_id, date, amount_billed, description")
        },
        uniqueConstraints = {
                // ✅ FIX: include description (and payment_type if you want it even stricter)
                @UniqueConstraint(
                        name = "uk_collections_dedupe",
                        columnNames = {
                                "control_number",
                                "gfs_code_id",
                                "centre_id",
                                "date",
                                "amount_billed",
                                "description"
                                // If you want even stricter, add "payment_type" too
                        }
                )
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

    /**
     * ✅ IMPORTANT:
     * description is now part of the unique key, so avoid nulls.
     * Keep it nullable=false with default "" so unique constraint works reliably.
     */
    @Column(name = "description", nullable = false, length = 255)
    private String description = "";

    @Column(name = "payment_type", length = 120)
    private String paymentType;

    @Column(name = "control_number", nullable = false, length = 60)
    private String controlNumber;

    @Column(name = "last_fetched", columnDefinition = "TIMESTAMP")
    private LocalDateTime lastFetched;

    @Column(nullable = false)
    private LocalDateTime date;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (description == null) description = ""; // ✅ ensure non-null before insert
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    protected void onUpdate() {
        if (description == null) description = ""; // ✅ ensure non-null before update
        updatedAt = LocalDateTime.now();
    }
}
