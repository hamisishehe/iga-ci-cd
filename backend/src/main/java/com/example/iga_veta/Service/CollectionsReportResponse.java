package com.example.iga_veta.dto;

import java.math.BigDecimal;
import java.util.List;

public class CollectionsReportResponse {
    private BigDecimal totalIncome;
    private long totalTransactions;

    // ✅ NEW
    private BigDecimal totalPaid;

    private int page;
    private int size;
    private long totalElements;
    private int totalPages;

    private List<?> rows;
    private List<?> summaryByService;
    private BigDecimal totalAmount;

    private List<String> centres;
    private List<String> zones;
    private List<ServiceOptionDto> services;

    public BigDecimal getTotalIncome() { return totalIncome; }
    public void setTotalIncome(BigDecimal totalIncome) { this.totalIncome = totalIncome; }

    public long getTotalTransactions() { return totalTransactions; }
    public void setTotalTransactions(long totalTransactions) { this.totalTransactions = totalTransactions; }

    // ✅ NEW
    public BigDecimal getTotalPaid() { return totalPaid; }
    public void setTotalPaid(BigDecimal totalPaid) { this.totalPaid = totalPaid; }

    public int getPage() { return page; }
    public void setPage(int page) { this.page = page; }

    public int getSize() { return size; }
    public void setSize(int size) { this.size = size; }

    public long getTotalElements() { return totalElements; }
    public void setTotalElements(long totalElements) { this.totalElements = totalElements; }

    public int getTotalPages() { return totalPages; }
    public void setTotalPages(int totalPages) { this.totalPages = totalPages; }

    public List<?> getRows() { return rows; }
    public void setRows(List<?> rows) { this.rows = rows; }

    public List<?> getSummaryByService() { return summaryByService; }
    public void setSummaryByService(List<?> summaryByService) { this.summaryByService = summaryByService; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public List<String> getCentres() { return centres; }
    public void setCentres(List<String> centres) { this.centres = centres; }

    public List<String> getZones() { return zones; }
    public void setZones(List<String> zones) { this.zones = zones; }

    public List<ServiceOptionDto> getServices() { return services; }
    public void setServices(List<ServiceOptionDto> services) { this.services = services; }
}
