package com.example.iga_veta.Model;

import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "allocation")
public class Allocation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(precision = 12, scale = 2)
    private BigDecimal originalAmount;

    @Column(precision = 12, scale = 2)
    private BigDecimal expenditureAmount;

    @Column(precision = 12, scale = 2)
    private BigDecimal profitAmountPerCentreReport;

    @Column(precision = 12, scale = 2)
    private BigDecimal differenceOnMarkup;

    @Column(precision = 12, scale = 2)
    private BigDecimal contributionToCentralIGA;

    @Column(precision = 12, scale = 2)
    private BigDecimal facilitationOfIGAForCentralActivities;

    @Column(precision = 12, scale = 2)
    private BigDecimal facilitationZonalActivities;

    @Column(precision = 12, scale = 2)
    private BigDecimal facilitationOfIGAForCentreActivities;

    @Column(precision = 12, scale = 2)
    private BigDecimal supportToProductionUnit;

    @Column(precision = 12, scale = 2)
    private BigDecimal contributionToCentreIGAFund;

    @Column(precision = 12, scale = 2)
    private BigDecimal depreciationIncentiveToFacilitators;

    @Column(precision = 12, scale = 2)
    private BigDecimal remittedToCentre;

    public String gfs_code;

    public String gfs_code_description;

    @ManyToOne
    @JoinColumn(name = "centre_id", nullable = false)
    private Centre centres;


    @Column(nullable = false)
    private LocalDateTime date;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @Column(name = "allocation_month")
    private Integer month;

    @Column(name = "allocation_year")
    private Integer year;


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
