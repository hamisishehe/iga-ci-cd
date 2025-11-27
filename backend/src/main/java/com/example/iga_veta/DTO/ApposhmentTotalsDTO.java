package com.example.iga_veta.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ApposhmentTotalsDTO {
    private Long apposhmentId;
    private Double totalServiceReturnProfit;
    private Double totalAgencyFee;
    private Double totalAmountPaidToPaid;
    private Double totalExecutors;
    private Double totalSupportersToExecutors;
}
