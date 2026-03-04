package com.example.iga_veta.Service;

import com.example.iga_veta.Model.*;
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
     * Allocate payments between custom date range (view only)
     */
    public List<Allocation> allocateAllCentres(List<Payment> payments,
                                               LocalDateTime startDate,
                                               LocalDateTime endDate) {

        List<Allocation> result = new ArrayList<>();

        List<Payment> filteredPayments = filterPaymentsByRange(payments, startDate, endDate);

        Map<Centre, List<Payment>> paymentsByCentre = filteredPayments.stream()
                .filter(p -> p.getCentre() != null)
                .collect(Collectors.groupingBy(Payment::getCentre));

        List<Centre> allCentres = centreRepository.findAll();

        for (Centre centre : allCentres) {
            List<Payment> centrePayments = paymentsByCentre.getOrDefault(centre, new ArrayList<>());

            if (!centrePayments.isEmpty()) {
                result.addAll(allocateByGfsCode(centrePayments));
            } else {
                result.add(createEmptyAllocation(centre));
            }
        }

        return result;
    }

    @Transactional
    public List<Allocation> allocateByGfsCode(List<Payment> payments) {
        List<Allocation> result = new ArrayList<>();

        if (payments == null || payments.isEmpty()) return result;

        Map<GfsCode, List<Payment>> grouped = payments.stream()
                .collect(Collectors.groupingBy(Payment::getGfsCode));

        for (Map.Entry<GfsCode, List<Payment>> entry : grouped.entrySet()) {
            GfsCode gfs = entry.getKey();
            List<Payment> groupPayments = entry.getValue();

            if (gfs == null) continue;

            // ✅ Special case: 142301600001
            if ("142301600001".equals(gfs.getCode())) {

                // split DRIVING vs SHORT COURSES (unchanged)
                Map<Boolean, List<Payment>> split = groupPayments.stream()
                        .collect(Collectors.partitioningBy(p -> isDriving(safeStr(p.getDescription()))));

                // 1) BASIC DRIVING (UNCHANGED)
                List<Payment> drvItems = split.get(true);
                if (drvItems != null && !drvItems.isEmpty()) {
                    BigDecimal markupPercent = parseMarkup(gfs.getMarkupPercent());
                    Allocation a = createSpecialAllocation(
                            drvItems,
                            gfs,
                            markupPercent,
                            "BASIC DRIVING",
                            gfs.getCode() + "-DRIVING"
                    );
                    if (a != null) result.add(a);
                }

                // 2) SHORT COURSES -> split by paymentType
                List<Payment> othItems = split.get(false);
                if (othItems != null && !othItems.isEmpty()) {

                    Map<Boolean, List<Payment>> scSplit = othItems.stream()
                            .collect(Collectors.partitioningBy(AllocationService::isShortCourseTuitionFee));

                    // 2A) Short Course Tuition Fee -> ✅ DO CALCULATION (markup 0.30)
                    List<Payment> scTuition = scSplit.get(true);
                    if (scTuition != null && !scTuition.isEmpty()) {
                        BigDecimal markupPercent = new BigDecimal("0.30");
                        Allocation a = createSpecialAllocation(
                                scTuition,
                                gfs,
                                markupPercent,
                                "SHORT COURSE TUITION FEE",
                                gfs.getCode() + "-SHORT_COURSE_TUITION_FEE"
                        );
                        if (a != null) result.add(a);
                    }

                    // 2B) Other Contribution -> ✅ NO CALC, expenditure = collections(total)
                    List<Payment> otherContribution = scSplit.get(false);
                    if (otherContribution != null && !otherContribution.isEmpty()) {
                        Allocation a = createNoCalcAllocation(
                                otherContribution,
                                "OTHER CONTRIBUTION",
                                gfs.getCode() + "-OTHER_CONTRIBUTION"
                        );
                        if (a != null) result.add(a);
                    }
                }

            } else {
                // Normal GFS codes (UNCHANGED)
                Allocation a = createSpecialAllocation(
                        groupPayments,
                        gfs,
                        parseMarkup(gfs.getMarkupPercent()),
                        gfs.getDescription(),
                        gfs.getCode()
                );
                if (a != null) result.add(a);
            }
        }

        return result;
    }

    // ==========================
    // HELPER METHODS
    // ==========================

    private List<Payment> filterPaymentsByRange(List<Payment> payments,
                                                LocalDateTime startDate,
                                                LocalDateTime endDate) {
        if (payments == null) return List.of();

        return payments.stream()
                .filter(p -> p.getPaymentDate() != null)
                .filter(p -> !p.getPaymentDate().isBefore(startDate) && !p.getPaymentDate().isAfter(endDate))
                .collect(Collectors.toList());
    }

    private static String safeStr(String s) {
        return s == null ? "" : s.trim();
    }

    private static boolean isDriving(String desc) {
        String d = safeStr(desc).toUpperCase();
        return d.contains("DRIVING") || d.contains("PSV") || d.contains("PVS");
    }

    private static boolean isShortCourseTuitionFee(Payment p) {
        String pt = (p == null) ? "" : safeStr(p.getPaymentType());
        return pt.equalsIgnoreCase("Short Course Tuition Fee");
    }

    private BigDecimal calc(BigDecimal amount, double percent) {
        return amount.multiply(BigDecimal.valueOf(percent))
                .setScale(2, RoundingMode.HALF_UP);
    }

    private Allocation createEmptyAllocation(Centre centre) {
        Allocation allocation = new Allocation();
        allocation.setCentre(centre);
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
        allocation.setGfs_code_description("No Payments (Custom Range)");
        return allocation;
    }

    /**
     * ✅ Other Contribution: NO CALCULATION
     * expenditure = collections(total)
     */
    private Allocation createNoCalcAllocation(List<Payment> payments,
                                              String allocationDescLabel,
                                              String overrideCode) {
        if (payments == null || payments.isEmpty()) return null;

        BigDecimal totalAmount = payments.stream()
                .map(p -> p.getTotalPaid() == null ? BigDecimal.ZERO : p.getTotalPaid())
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        Allocation allocation = new Allocation();
        allocation.setOriginalAmount(totalAmount);

        // ✅ show collections as expenditure
        allocation.setExpenditureAmount(totalAmount);

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

        allocation.setDate(payments.get(0).getPaymentDate());
        allocation.setCentre(payments.get(0).getCentre());
        allocation.setGfs_code(overrideCode);
        allocation.setGfs_code_description(safeStr(allocationDescLabel));
        return allocation;
    }

    private Allocation createSpecialAllocation(List<Payment> payments,
                                               GfsCode gfs,
                                               BigDecimal markupPercent,
                                               String allocationDescLabel,
                                               String overrideCode) {

        if (payments == null || payments.isEmpty()) return null;

        BigDecimal totalAmount = payments.stream()
                .map(p -> p.getTotalPaid() == null ? BigDecimal.ZERO : p.getTotalPaid())
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal expenditure;
        BigDecimal profitMarkupPerCentre;
        BigDecimal differenceOnMarkup;

        if ("Receipts from Application Fee".equalsIgnoreCase(allocationDescLabel)) {
            expenditure = BigDecimal.ZERO;
            profitMarkupPerCentre = totalAmount;
            differenceOnMarkup = totalAmount;
        } else {
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
        allocation.setDate(payments.get(0).getPaymentDate());
        allocation.setProfitAmountPerCentreReport(profitMarkupPerCentre);

        // ✅ KEEP Tuition Fees rule AS-IS (ONLY Tuition Fees)
        if ("Tuition Fees".equalsIgnoreCase(allocationDescLabel)) {
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
            allocation.setContributionToCentralIGA(calc(profitMarkupPerCentre, 0.30));
            allocation.setFacilitationOfIGAForCentralActivities(calc(profitMarkupPerCentre, 0.04));
            allocation.setFacilitationZonalActivities(calc(profitMarkupPerCentre, 0.04));
            allocation.setFacilitationOfIGAForCentreActivities(calc(profitMarkupPerCentre, 0.02));
            allocation.setSupportToProductionUnit(calc(profitMarkupPerCentre, 0.00));
            allocation.setContributionToCentreIGAFund(calc(profitMarkupPerCentre, 0.60));
            allocation.setDepreciationIncentiveToFacilitators(calc(profitMarkupPerCentre, 0.00));
            allocation.setRemittedToCentre(calc(profitMarkupPerCentre, 0.62));
        } else {
            allocation.setContributionToCentralIGA(calc(profitMarkupPerCentre, 0.30));
            allocation.setFacilitationOfIGAForCentralActivities(calc(profitMarkupPerCentre, 0.04));
            allocation.setFacilitationZonalActivities(calc(profitMarkupPerCentre, 0.04));
            allocation.setFacilitationOfIGAForCentreActivities(calc(profitMarkupPerCentre, 0.02));
            allocation.setSupportToProductionUnit(calc(profitMarkupPerCentre, 0.00));
            allocation.setContributionToCentreIGAFund(calc(profitMarkupPerCentre, 0.60));
            allocation.setDepreciationIncentiveToFacilitators(calc(profitMarkupPerCentre, 0.00));
            allocation.setRemittedToCentre(calc(profitMarkupPerCentre, 0.62));
        }

        allocation.setCentre(payments.get(0).getCentre());
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