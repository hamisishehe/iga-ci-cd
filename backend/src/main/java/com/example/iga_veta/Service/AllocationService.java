package com.example.iga_veta.Service;

import com.example.iga_veta.Model.Allocation;
import com.example.iga_veta.Model.Centre;
import com.example.iga_veta.Model.Collections;
import com.example.iga_veta.Model.GfsCode;
import com.example.iga_veta.Repository.AllocationRepository;
import com.example.iga_veta.Repository.CentreRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AllocationService {

    private final AllocationRepository allocationRepository;

    @Autowired
    private CentreRepository centreRepository;

    // ==========================
    // PUBLIC METHODS
    // ==========================

    /**
     * Allocate collections between custom date range (view only)
     *
     * @param collections List of all collections
     * @param startDate   Start of range (inclusive)
     * @param endDate     End of range (inclusive)
     * @return List of allocations
     */
    public List<Allocation> allocateAllCentres(List<Collections> collections,
                                               LocalDateTime startDate,
                                               LocalDateTime endDate) {

        List<Allocation> result = new ArrayList<>();

        // Filter collections by date range
        List<Collections> filteredCollections = filterCollectionsByRange(collections, startDate, endDate);

        // Group by centre
        Map<Centre, List<Collections>> collectionsByCentre = filteredCollections.stream()
                .collect(Collectors.groupingBy(Collections::getCentres));

        List<Centre> allCentres = centreRepository.findAll();

        for (Centre centre : allCentres) {
            List<Collections> centreCollections = collectionsByCentre.getOrDefault(centre, new ArrayList<>());

            if (!centreCollections.isEmpty()) {
                // Allocate by GFS code for this centre
                result.addAll(allocateByGfsCode(centreCollections));
            } else {
                // No collections → add empty allocation for view
                result.add(createEmptyAllocation(centre));
            }
        }

        return result;
    }

    @Transactional
    public List<Allocation> allocateByGfsCode(List<Collections> collections) {
        List<Allocation> result = new ArrayList<>();

        // Group collections by GFS code
        Map<GfsCode, List<Collections>> grouped = collections.stream()
                .collect(Collectors.groupingBy(Collections::getGfs_code));

        for (Map.Entry<GfsCode, List<Collections>> entry : grouped.entrySet()) {
            GfsCode gfs = entry.getKey();
            List<Collections> groupCollections = entry.getValue();

            // Special case: 142301600001 → split DRIVING vs SHORT COURSES
            if ("142301600001".equals(gfs.getCode())) {
                Map<Boolean, List<Collections>> split = groupCollections.stream()
                        .collect(Collectors.partitioningBy(c -> isDriving(safeStr(c.getDescription()))));

                // DRIVING
                List<Collections> drvItems = split.get(true);
                if (drvItems != null && !drvItems.isEmpty()) {
                    BigDecimal markupPercent = parseMarkup(gfs.getMarkupPercent());
                    result.add(createSpecialAllocation(drvItems, gfs, markupPercent, "BASIC DRIVING", gfs.getCode() + "-DRIVING"));
                }

                // SHORT COURSES
                List<Collections> othItems = split.get(false);
                if (othItems != null && !othItems.isEmpty()) {
                    BigDecimal markupPercent = new BigDecimal("0.30");
                    result.add(createSpecialAllocation(othItems, gfs, markupPercent, "SHORT COURSES", gfs.getCode() + "-SHORT COURSES"));
                }

            } else {
                // Normal GFS codes
                result.add(createSpecialAllocation(groupCollections, gfs, parseMarkup(gfs.getMarkupPercent()), gfs.getDescription(), gfs.getCode()));
            }
        }

        return result;
    }

    // ==========================
    // HELPER METHODS
    // ==========================

    private List<Collections> filterCollectionsByRange(List<Collections> collections,
                                                       LocalDateTime startDate,
                                                       LocalDateTime endDate) {
        return collections.stream()
                .filter(c -> c.getDate() != null)
                .filter(c -> !c.getDate().isBefore(startDate) && !c.getDate().isAfter(endDate))
                .collect(Collectors.toList());
    }

    private static String safeStr(String s) {
        return s == null ? "" : s.trim();
    }

    private static boolean isDriving(String colDesc) {
        String d = safeStr(colDesc).toUpperCase();
        return d.contains("DRIVING") || d.contains("PSV") || d.contains("PVS");
    }

    private BigDecimal calc(BigDecimal amount, double percent) {
        return amount.multiply(BigDecimal.valueOf(percent))
                .setScale(2, RoundingMode.HALF_UP);
    }

    private Allocation createEmptyAllocation(Centre centre) {
        Allocation allocation = new Allocation();
        allocation.setCentres(centre);
        allocation.setOriginalAmount(BigDecimal.ZERO);
        allocation.setExpenditureAmount(BigDecimal.ZERO);
        allocation.setProfitAmountPerCentreReport(BigDecimal.ZERO);
        allocation.setDifferenceOnMarkup(BigDecimal.ZERO);
        allocation.setContributionToCentralIGA(BigDecimal.ZERO);
        allocation.setFacilitationOfIGAForCentralActivities(BigDecimal.ZERO);
        allocation.setFacilitationZonalActivities(BigDecimal.ZERO);
        allocation.setFacilitationOfIGAForCentreActivities(BigDecimal.ZERO);
        allocation.setSupportToProductionUnit(BigDecimal.ZERO);
        allocation.setContributionToCentreIGAFund(BigDecimal.ZERO);
        allocation.setDepreciationIncentiveToFacilitators(BigDecimal.ZERO);
        allocation.setRemittedToCentre(BigDecimal.ZERO);
        allocation.setGfs_code("N/A");
        allocation.setGfs_code_description("No Collections (Custom Range)");
        return allocation;
    }

    private Allocation createSpecialAllocation(List<Collections> collections,
                                               GfsCode gfs,
                                               BigDecimal markupPercent,
                                               String allocationDescLabel,
                                               String overrideCode) {

        if (collections.isEmpty()) return null;

        BigDecimal totalAmount = collections.stream()
                .map(Collections::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal expenditure;
        BigDecimal profitMarkupPerCentre;
        BigDecimal differenceOnMarkup;

        // Special case: Application Fee → no expenditure
        if ("Receipts from Application Fee".equalsIgnoreCase(allocationDescLabel)) {
            expenditure = BigDecimal.ZERO;
            profitMarkupPerCentre = totalAmount;
            differenceOnMarkup = totalAmount;
        } else {
            // Normal calculation
            expenditure = totalAmount.divide(
                    BigDecimal.ONE.add(markupPercent), 4, RoundingMode.HALF_UP
            );
            profitMarkupPerCentre = totalAmount.subtract(expenditure);
            differenceOnMarkup = expenditure.subtract(profitMarkupPerCentre);
        }

        Allocation allocation = new Allocation();
        allocation.setOriginalAmount(totalAmount);
        allocation.setDifferenceOnMarkup(differenceOnMarkup);
        allocation.setExpenditureAmount(expenditure);
        allocation.setDate(collections.get(0).getDate());
        allocation.setProfitAmountPerCentreReport(profitMarkupPerCentre);

        // Contributions
        if ("Tuition Fees".equalsIgnoreCase(allocationDescLabel)) {
            // All zero for Tuition Fees
            allocation.setExpenditureAmount(BigDecimal.ZERO);
            allocation.setProfitAmountPerCentreReport(BigDecimal.ZERO);
            allocation.setContributionToCentralIGA(BigDecimal.ZERO);
            allocation.setFacilitationOfIGAForCentralActivities(BigDecimal.ZERO);
            allocation.setFacilitationZonalActivities(BigDecimal.ZERO);
            allocation.setFacilitationOfIGAForCentreActivities(BigDecimal.ZERO);
            allocation.setSupportToProductionUnit(BigDecimal.ZERO);
            allocation.setContributionToCentreIGAFund(BigDecimal.ZERO);
            allocation.setDepreciationIncentiveToFacilitators(BigDecimal.ZERO);
            allocation.setRemittedToCentre(BigDecimal.ZERO);
        } else if (!"Receipts from Application Fee".equalsIgnoreCase(allocationDescLabel)) {
            // Normal contributions for other collections
            allocation.setContributionToCentralIGA(calc(profitMarkupPerCentre, 0.30));
            allocation.setFacilitationOfIGAForCentralActivities(calc(profitMarkupPerCentre, 0.04));
            allocation.setFacilitationZonalActivities(calc(profitMarkupPerCentre, 0.04));
            allocation.setFacilitationOfIGAForCentreActivities(calc(profitMarkupPerCentre, 0.02));
            allocation.setSupportToProductionUnit(calc(profitMarkupPerCentre, 0.00));
            allocation.setContributionToCentreIGAFund(calc(profitMarkupPerCentre, 0.60));
            allocation.setDepreciationIncentiveToFacilitators(calc(profitMarkupPerCentre, 0.00));
            allocation.setRemittedToCentre(calc(profitMarkupPerCentre, 0.62));
        } else {
            // Application Fee → keep contributions as needed
            allocation.setContributionToCentralIGA(calc(profitMarkupPerCentre, 0.30));
            allocation.setFacilitationOfIGAForCentralActivities(calc(profitMarkupPerCentre, 0.04));
            allocation.setFacilitationZonalActivities(calc(profitMarkupPerCentre, 0.04));
            allocation.setFacilitationOfIGAForCentreActivities(calc(profitMarkupPerCentre, 0.02));
            allocation.setSupportToProductionUnit(calc(profitMarkupPerCentre, 0.00));
            allocation.setContributionToCentreIGAFund(calc(profitMarkupPerCentre, 0.60));
            allocation.setDepreciationIncentiveToFacilitators(calc(profitMarkupPerCentre, 0.00));
            allocation.setRemittedToCentre(calc(profitMarkupPerCentre, 0.62));
        }

        allocation.setCentres(collections.get(0).getCentres());
        allocation.setGfs_code(overrideCode);
        allocation.setGfs_code_description(safeStr(allocationDescLabel));

        return allocation;
    }

    private BigDecimal parseMarkup(String markupPercent) {
        if (markupPercent == null || markupPercent.isBlank()) return BigDecimal.ZERO;
        try {
            String mp = markupPercent.replace("%", "").trim();
            BigDecimal parsed = new BigDecimal(mp);
            return parsed.compareTo(BigDecimal.ONE) > 0
                    ? parsed.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP)
                    : parsed;
        } catch (NumberFormatException e) {
            return BigDecimal.ZERO;
        }
    }

}
