package com.example.iga_veta.Service;

import com.example.iga_veta.DTO.ApposhmentDTO;
import com.example.iga_veta.DTO.CentreDTO;
import com.example.iga_veta.DTO.ServiceItemDTO;
import com.example.iga_veta.Model.Apposhment;
import com.example.iga_veta.Model.Centre;
import com.example.iga_veta.Model.ServiceItem;
import com.example.iga_veta.Model.ServiceRequest;
import com.example.iga_veta.Repository.ApposhmentRepository;
import com.example.iga_veta.Repository.CentreRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class ApposhmentService {


    @Autowired
    private ApposhmentRepository apposhmentRepository;

    @Autowired
    private CentreRepository centreRepository;


    // Save new apposhment
    public String saveApposhment(Long centreId,
                                 LocalDate startDate,
                                 LocalDate endDate,
                                 List<ServiceRequest> services) {

        // Check if an Apposhment already exists for the same centre and date range
        Boolean exist = apposhmentRepository.existsApposhment(
                centreId,
                startDate,
                endDate
        );

        if (exist) {
            System.out.println("Apposhment already exists!");
            return "Apposhment already exists!";
        } else {

            // Fetch the centre
            Centre centre = centreRepository.findById(centreId)
                    .orElseThrow(() -> new RuntimeException("Centre not found with ID: " + centreId));

            // Create Apposhment
            Apposhment apposhment = new Apposhment();
            apposhment.setStart_date(startDate);
            apposhment.setEnd_date(endDate);
            apposhment.setCentres(centre);

            // Map each service to ServiceItem entity
            List<ServiceItem> serviceItems = services.stream().map(s -> {
                ServiceItem item = new ServiceItem();
                item.setService_name(s.getService_name());
                item.setExecutors(BigDecimal.valueOf(s.getService_return_profit() * 0.10));
                item.setSupporters_to_executors(BigDecimal.valueOf(s.getService_return_profit() * 0.05));
                item.setAgency_fee(BigDecimal.valueOf(s.getService_return_profit() * 0.05));
                item.setAmount_paid_to_paid(item.getExecutors().add(item.getSupporters_to_executors()));
                item.setService_return_profit(BigDecimal.valueOf(s.getService_return_profit()));
                item.setApposhment(apposhment); // important to link child to parent
                return item;
            }).toList();

            // Set services to Apposhment
            apposhment.setServices(serviceItems);

            // Save Apposhment (cascades to services)
            apposhmentRepository.save(apposhment);

            return "Apposhment with services saved successfully!";
        }
    }


    // Fetch all apposhments

    public List<ApposhmentDTO> getAllApposhmentsWithServices() {
        List<Apposhment> apposhments = apposhmentRepository.findAll();

        return apposhments.stream().map(app -> {
            ApposhmentDTO dto = new ApposhmentDTO();
            dto.setId(app.getId());
            dto.setStartDate(app.getStart_date());
            dto.setEndDate(app.getEnd_date());
            dto.setCentre(new CentreDTO(app.getCentres()));

            List<ServiceItemDTO> serviceDTOs = app.getServices().stream().map(service -> {
                ServiceItemDTO sDto = new ServiceItemDTO();
                sDto.setId(service.getId());
                sDto.setServiceName(service.getService_name());
                sDto.setServiceReturnProfit(service.getService_return_profit());
                sDto.setExecutors(service.getExecutors());
                sDto.setSupporters_to_executors(service.getSupporters_to_executors());
                sDto.setAgency_fee(service.getAgency_fee());
                sDto.setAmount_paid_to_paid(service.getAmount_paid_to_paid());
                sDto.setCreatedAt(service.getCreatedAt());
                return sDto;
            }).collect(Collectors.toList());

            dto.setServices(serviceDTOs);
            return dto;
        }).collect(Collectors.toList());
    }

    public List<Apposhment> getAllApposhments() {
        return apposhmentRepository.findAll();
    }

    // Fetch by id
    public Optional<Apposhment> getApposhmentById(Long id) {
        return apposhmentRepository.findById(id);
    }

    // Update apposhment
//    public String updateApposhment(Long id, Apposhment updated) {
//        return apposhmentRepository.findById(id).map(existing -> {
//            existing.setService_name(updated.getService_name());
//            existing.setService_return_profit(updated.getService_return_profit());
//            existing.setStart_date(updated.getStart_date());
//            existing.setEnd_date(updated.getEnd_date());
//            existing.setCentres(updated.getCentres());
//            apposhmentRepository.save(existing);
//            return "Apposhment updated successfully!";
//        }).orElse("Apposhment not found!");
//    }

    // Delete apposhment
    public String deleteApposhment(Long id) {
        if (apposhmentRepository.existsById(id)) {
            apposhmentRepository.deleteById(id);
            return "Apposhment deleted successfully!";
        }
        return "Apposhment not found!";
    }


    public List<Apposhment> getApposhmentsByCentreId(Long centreId){

        Centre centre = centreRepository.findById(centreId).orElseThrow();

        return apposhmentRepository.findByCentres(centre);

    }
}
