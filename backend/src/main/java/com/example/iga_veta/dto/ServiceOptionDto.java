package com.example.iga_veta.dto;

public class ServiceOptionDto {
    private String serviceCode;
    private String serviceDesc;

    public ServiceOptionDto() {}
    public ServiceOptionDto(String serviceCode, String serviceDesc) {
        this.serviceCode = serviceCode;
        this.serviceDesc = serviceDesc;
    }

    public String getServiceCode() { return serviceCode; }
    public void setServiceCode(String serviceCode) { this.serviceCode = serviceCode; }

    public String getServiceDesc() { return serviceDesc; }
    public void setServiceDesc(String serviceDesc) { this.serviceDesc = serviceDesc; }
}
