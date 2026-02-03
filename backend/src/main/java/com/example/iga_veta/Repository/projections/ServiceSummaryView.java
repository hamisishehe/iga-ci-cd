package com.example.iga_veta.Repository.projections;

import java.math.BigDecimal;

public interface ServiceSummaryView {
    String getServiceCode();
    String getServiceDesc();
    BigDecimal getTotal();
}
