package com.example.iga_veta.Repository.projections;

import java.math.BigDecimal;

public interface ServiceSummaryView {
    String getServiceCode();      // we can return null
    String getServiceDesc();      // paymentType
    BigDecimal getTotalBilled();
    BigDecimal getTotalPaid();
    Long getTotalTransactions();
}