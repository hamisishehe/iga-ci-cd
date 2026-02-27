package com.example.iga_veta.Repository;

import com.example.iga_veta.Model.Payment;
import com.example.iga_veta.Repository.projections.PaymentRowView;
import com.example.iga_veta.Repository.projections.ServiceSummaryView;
import com.example.iga_veta.Repository.projections.TotalsView;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByPaymentId(Long paymentId);

    Optional<Payment> findByPaymentIdAndGfsCode_Id(Long paymentId, Long gfsCodeId);

    Optional<Payment> findByPaymentIdAndGfsCode_Code(Long paymentId, String code);

    @Query("select max(p.paymentDate) from Payment p")
    Optional<LocalDateTime> findMaxPaymentDate();

    /**
     * totals -> [sum(totalBilled), count(*), sum(totalPaid)]
     */
    @Query("""
        select
          coalesce(sum(p.totalBilled), 0),
          count(p),
          coalesce(sum(p.totalPaid), 0)
        from Payment p
        where p.paymentDate >= :start and p.paymentDate < :end
          and (:centreName is null or p.centre.name = :centreName)
          and (:zoneName is null or p.centre.zones.name = :zoneName)
    """)
    List<Object[]> totals(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            @Param("centreName") String centreName,
            @Param("zoneName") String zoneName
    );

    /**
     * TOP SERVICES (payments-only):
     * Option A: group by paymentType (recommended if using only payments table)
     * returns [paymentType, sum(totalBilled)]
     */
    @Query("""
        select
          coalesce(p.paymentType, 'UNKNOWN') as paymentType,
          coalesce(sum(p.totalBilled), 0) as total
        from Payment p
        where p.paymentDate >= :start and p.paymentDate < :end
          and (:centreName is null or p.centre.name = :centreName)
          and (:zoneName is null or p.centre.zones.name = :zoneName)
        group by coalesce(p.paymentType, 'UNKNOWN')
        order by total desc
    """)
    List<Object[]> topPaymentTypes(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            @Param("centreName") String centreName,
            @Param("zoneName") String zoneName,
            Pageable pageable
    );

    /**
     * TOP CENTERS -> [centreName, sum(totalBilled)]
     */
    @Query("""
        select
          p.centre.name as centreName,
          coalesce(sum(p.totalBilled), 0) as total
        from Payment p
        where p.paymentDate >= :start and p.paymentDate < :end
          and (:centreName is null or p.centre.name = :centreName)
          and (:zoneName is null or p.centre.zones.name = :zoneName)
        group by p.centre.name
        order by total desc
    """)
    List<Object[]> topCenters(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            @Param("centreName") String centreName,
            @Param("zoneName") String zoneName,
            Pageable pageable
    );

    /**
     * BOTTOM CENTERS -> [centreName, sum(totalBilled)]
     */
    @Query("""
        select
          p.centre.name as centreName,
          coalesce(sum(p.totalBilled), 0) as total
        from Payment p
        where p.paymentDate >= :start and p.paymentDate < :end
          and (:centreName is null or p.centre.name = :centreName)
          and (:zoneName is null or p.centre.zones.name = :zoneName)
        group by p.centre.name
        order by total asc
    """)
    List<Object[]> bottomCenters(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            @Param("centreName") String centreName,
            @Param("zoneName") String zoneName,
            Pageable pageable
    );

    /**
     * RECENT PAYMENTS -> for dashboard list
     * returns:
     * [customerName, centreName, zoneName, paymentType, totalBilled, totalPaid, paymentDate]
     */
    @Query("""
        select
          p.customer.name,
          p.centre.name,
          p.centre.zones.name,
          p.paymentType,
          p.totalBilled,
          p.totalPaid,
          p.paymentDate
        from Payment p
        where p.paymentDate >= :start and p.paymentDate < :end
          and (:centreName is null or p.centre.name = :centreName)
          and (:zoneName is null or p.centre.zones.name = :zoneName)
        order by p.paymentDate desc, p.id desc
    """)
    List<Object[]> recentPayments(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            @Param("centreName") String centreName,
            @Param("zoneName") String zoneName,
            Pageable pageable
    );


    // paymentType options (used as service dropdown in payments-only report)
    @Query("select distinct coalesce(p.paymentType, 'UNKNOWN') from Payment p order by coalesce(p.paymentType, 'UNKNOWN')")
    List<String> paymentTypeOptions();


    @Query("""
        select
          coalesce(sum(p.totalBilled), 0) as totalIncome,
          coalesce(sum(p.totalPaid), 0)   as totalPaid,
          count(p)                        as totalTransactions
        from Payment p
        where p.paymentDate >= :start and p.paymentDate < :end
          and (:centreName is null or p.centre.name = :centreName)
          and (:zoneName is null or p.centre.zones.name = :zoneName)
          and (:gfsCode is null or p.gfsCode.code = :gfsCode)
    """)
    TotalsView totalsView(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            @Param("centreName") String centreName,
            @Param("zoneName") String zoneName,
            @Param("gfsCode") String gfsCode
    );

    // ✅ report rows page (THIS feeds the table)
    @Query("""
        select
          p.id as id,
          p.paymentId as paymentId,
          p.customer.name as customerName,
          p.centre.name as centreName,
          p.centre.zones.name as zoneName,
          p.paymentType as paymentType,
          p.controlNumber as controlNumber,
          p.totalBilled as totalBilled,
          p.totalPaid as totalPaid,
          p.paymentDate as paymentDate,
          coalesce(p.gfsCode.code, 'UNKNOWN') as gfsCode,
          coalesce(p.gfsCode.description, 'UNKNOWN') as gfsDesc
        from Payment p
        where p.paymentDate >= :start and p.paymentDate < :end
          and (:centreName is null or p.centre.name = :centreName)
          and (:zoneName is null or p.centre.zones.name = :zoneName)
          and (:gfsCode is null or p.gfsCode.code = :gfsCode)
        order by p.paymentDate desc, p.id desc
    """)
    Page<PaymentRowView> reportRows(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            @Param("centreName") String centreName,
            @Param("zoneName") String zoneName,
            @Param("gfsCode") String gfsCode,
            Pageable pageable
    );

    // ✅ summary by GFS code/desc (bottom table)
    @Query("""
        select
          coalesce(p.gfsCode.code, 'UNKNOWN') as serviceCode,
          coalesce(p.gfsCode.description, 'UNKNOWN') as serviceDesc,
          coalesce(sum(p.totalBilled), 0) as totalBilled,
          coalesce(sum(p.totalPaid), 0) as totalPaid,
          count(p) as totalTransactions
        from Payment p
        where p.paymentDate >= :start and p.paymentDate < :end
          and (:centreName is null or p.centre.name = :centreName)
          and (:zoneName is null or p.centre.zones.name = :zoneName)
          and (:gfsCode is null or p.gfsCode.code = :gfsCode)
        group by coalesce(p.gfsCode.code, 'UNKNOWN'), coalesce(p.gfsCode.description, 'UNKNOWN')
        order by totalBilled desc
    """)
    List<ServiceSummaryView> summaryByService(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            @Param("centreName") String centreName,
            @Param("zoneName") String zoneName,
            @Param("gfsCode") String gfsCode
    );

    // ✅ options
    @Query("select distinct p.centre.name from Payment p order by p.centre.name")
    List<String> centreOptions();

    @Query("select distinct p.centre.zones.name from Payment p order by p.centre.zones.name")
    List<String> zoneOptions();

    // ✅ dropdown services from gfs_code present in payments
    @Query("""
        select distinct
          coalesce(p.gfsCode.code, 'UNKNOWN'),
          coalesce(p.gfsCode.description, 'UNKNOWN')
        from Payment p
        order by coalesce(p.gfsCode.code, 'UNKNOWN')
    """)
    List<Object[]> serviceOptions();

    // optional if you still need totalAmount separately
    @Query("""
        select coalesce(sum(p.totalBilled), 0)
        from Payment p
        where p.paymentDate >= :start and p.paymentDate < :end
          and (:centreName is null or p.centre.name = :centreName)
          and (:zoneName is null or p.centre.zones.name = :zoneName)
          and (:gfsCode is null or p.gfsCode.code = :gfsCode)
    """)
    BigDecimal totalAmount(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            @Param("centreName") String centreName,
            @Param("zoneName") String zoneName,
            @Param("gfsCode") String gfsCode
    );
}