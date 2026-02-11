package com.example.iga_veta.Repository.projections;

import java.math.BigDecimal;

public interface TotalsView {
    BigDecimal getTotalIncome();

    BigDecimal getTotalPaid();
    Long getTotalTransactions();
}
