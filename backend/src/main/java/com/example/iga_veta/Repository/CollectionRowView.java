package com.example.iga_veta.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public interface CollectionRowView {
    Long getId();
    String getCustomerName();
    String getCentreName();
    String getZoneName();
    String getServiceCode();
    String getServiceDesc();

    String getPaymentType();

    String getControlNumber();

    BigDecimal getAmount();
    LocalDateTime getDatePaid();
}
