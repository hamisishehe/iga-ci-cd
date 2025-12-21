package com.example.iga_veta.Controller;


import com.example.iga_veta.Model.ApiUsage;
import com.example.iga_veta.Model.Department;
import com.example.iga_veta.Repository.ApiUsageRepository;
import com.example.iga_veta.Service.DepartmentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("api/department")
public class DepartmentController {

    @Autowired
    public DepartmentService departmentService;


    @Autowired
    private ApiUsageRepository apiUsageRepository;


    @GetMapping("/get")
    public List<Department> getDepartments() {
        trackUsage("/get_all", "GET");
        return departmentService.findAll();
    }


    private void trackUsage(String endpoint, String method) {

        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String username = (auth != null && auth.isAuthenticated()) ? auth.getName() : "anonymous";

            ApiUsage usage = new ApiUsage();
            usage.setUsername(username);
            usage.setEndpoint("/departments" + endpoint);
            usage.setMethod(method);
            usage.setTimestamp(LocalDateTime.now());

            apiUsageRepository.save(usage);
        } catch (Exception e) {
            e.printStackTrace(); // Logging failure should not break the request
        }
    }

}
