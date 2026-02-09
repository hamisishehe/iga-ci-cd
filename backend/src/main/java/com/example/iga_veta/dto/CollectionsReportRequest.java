package com.example.iga_veta.dto;

import java.time.LocalDate;

public class CollectionsReportRequest {
    private LocalDate fromDate;
    private LocalDate toDate;
    private String centre;      // centre name or null
    private String zone;        // zone name or null
    private String serviceCode; // code or null


    private Integer page;       // 0...
    private Integer size;       // 10...

    public LocalDate getFromDate() { return fromDate; }
    public void setFromDate(LocalDate fromDate) { this.fromDate = fromDate; }

    public LocalDate getToDate() { return toDate; }
    public void setToDate(LocalDate toDate) { this.toDate = toDate; }

    public String getCentre() { return centre; }
    public void setCentre(String centre) { this.centre = centre; }

    public String getZone() { return zone; }
    public void setZone(String zone) { this.zone = zone; }

    public String getServiceCode() { return serviceCode; }
    public void setServiceCode(String serviceCode) { this.serviceCode = serviceCode; }

    public Integer getPage() { return page; }
    public void setPage(Integer page) { this.page = page; }

    public Integer getSize() { return size; }
    public void setSize(Integer size) { this.size = size; }
}
