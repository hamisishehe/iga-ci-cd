package com.example.iga_veta.Service;


import com.example.iga_veta.dto.ApposhmentDistributionDTO;
import com.example.iga_veta.Model.Apposhment;
import com.example.iga_veta.Model.ApposhmentDistribution;
import com.example.iga_veta.Repository.ApposhmentDistributionRepository;
import com.example.iga_veta.Repository.ApposhmentRepository;
import com.example.iga_veta.Repository.ServiceItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
public class ApposhmentDistributionService {

    @Autowired
    private ApposhmentDistributionRepository apposhmentDistributionRepository;

    @Autowired
    private ApposhmentRepository apposhmentRepository;

    @Autowired
    private ServiceItemRepository serviceItemRepository;



    public String saveApposhmentDistribution(String description, BigDecimal amount,String service_name, Long apposhmentId){

        Apposhment apposhment = apposhmentRepository.findById(apposhmentId).orElseThrow();

        BigDecimal totalFrom = apposhmentDistributionRepository.getTotalAmountByApposhmentId(apposhmentId);
        if (totalFrom == null) {
            totalFrom = BigDecimal.ZERO;
        }

        Object result = serviceItemRepository.getTotalsByApposhmentId(apposhmentId);

        if (result == null) {
            return null;
        }

        Object[] row = (Object[]) result;
        // Extract individual values
        Long apposhmentIdValue = ((Number) row[0]).longValue();

        BigDecimal returnprofit = row[1] != null ? new BigDecimal(row[1].toString()) : BigDecimal.ZERO;
        BigDecimal totalExecutors = row[4] != null ? new BigDecimal(row[4].toString()) : BigDecimal.ZERO;
        BigDecimal totalSupportersToExecutors = row[5] != null ? new BigDecimal(row[5].toString()) : BigDecimal.ZERO;
        BigDecimal totalAgencyFee = row[2] != null ? new BigDecimal(row[2].toString()) : BigDecimal.ZERO;
        BigDecimal totalAmountPaidToPaid = row[3] != null ? new BigDecimal(row[3].toString()) : BigDecimal.ZERO;

        // Calculate totalServiceReturnProfit as the sum of others
        BigDecimal totalServiceReturnProfit = totalExecutors
                .add(totalSupportersToExecutors)
                .add(totalAgencyFee);


        BigDecimal remaining = returnprofit.subtract(totalServiceReturnProfit);
        BigDecimal fullamount = totalFrom.add(amount);

        System.out.println("Total from: " + totalFrom);
        System.out.println("Total amount: " + amount);
        System.out.println("Total remaining: " + remaining);
        System.out.println("Total full amount: " + fullamount);

        if (fullamount.compareTo(remaining) > 0) {
            System.out.println("Not enough money to distribute");
            return "Not enough money to distribute";
        }
        else {
            ApposhmentDistribution apposhmentDistribution = new ApposhmentDistribution();
            apposhmentDistribution.setAmount(amount);
            apposhmentDistribution.setDescription(description);
            apposhmentDistribution.setName(service_name);
            apposhmentDistribution.setApposhments(apposhment);
            apposhmentDistributionRepository.save(apposhmentDistribution);
            return "apposhment distribution saved";
        }




    }

    public List<ApposhmentDistributionDTO> getAllApposhmentDistributions(Long apposhmentId){



        Apposhment apposhment = apposhmentRepository.findById(apposhmentId).orElseThrow();


        return apposhmentDistributionRepository.findAllByApposhments(apposhment)
                .stream()
                .map(distribution -> ApposhmentDistributionDTO.builder()
                        .id(distribution.getId())
                        .description(distribution.getDescription())
                        .amount(distribution.getAmount())
                        .service_name(distribution.getName())
                        .build()
                )
                .toList();
    }

}
