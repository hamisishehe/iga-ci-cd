package com.example.iga_veta.Repository.projections;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public interface PaymentRowView {
    Long getId();
    String getCustomerName();
    String getCentreName();
    String getZoneName();

    // existing
    String getPaymentType();
    String getControlNumber();
    BigDecimal getTotalBilled();
    BigDecimal getTotalPaid();
    LocalDateTime getPaymentDate();
    Long getPaymentId();

    // ✅ NEW (from gfs_code)
    String getGfsCode();
    String getGfsDesc();
}