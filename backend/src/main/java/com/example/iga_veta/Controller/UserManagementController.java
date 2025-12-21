package com.example.iga_veta.Controller;


import com.example.iga_veta.Model.ApiUsage;
import com.example.iga_veta.Model.User;
import com.example.iga_veta.Repository.ApiUsageRepository;
import com.example.iga_veta.Repository.UserRepository;
import com.example.iga_veta.Service.JwtService;
import com.example.iga_veta.Service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")
public class UserManagementController {

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private ApiUsageRepository apiUsageRepository;


    @GetMapping("/get")
    public List<User> getUsers() {
        trackUsage("/get_all", "GET");
        return userService.getAllUsers();
    }

    @GetMapping("/get/{id}")
    public User getUser(@PathVariable Long id){
        trackUsage("/get_all-id", "GET");
        return userService.getUserById(id);
    }


    @GetMapping("/get-by-centre-and-departments")
    public List<User> getUsersForCurrentUser() {
        trackUsage("/get_all-by_centre", "GET");
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();

        User loggedInUser = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Logged in user not found"));
        return userService.getUsersForLoggedInUser(loggedInUser);
    }


    @PostMapping("/save")
    public String addUser(@RequestBody Map<String, String> body) {
        trackUsage("/create_user", "GET");
        try {
            String firstName = body.getOrDefault("firstName", "");
            String middleName = body.getOrDefault("middleName", "");
            String lastName = body.getOrDefault("lastName", "");
            String userName = body.getOrDefault("userName", "");
            String email = body.getOrDefault("email", "");
            String phoneNumber = body.getOrDefault("phoneNumber", "");
            String password = body.getOrDefault("password", "");
            Long centreId = Long.valueOf(body.get("centreId"));
            Long departmentId = Long.valueOf(body.get("departmentId"));
            String role = body.get("role");
            String userType = body.get("userType");
            User.Status status = parseEnumSafely(User.Status.class, body.get("status"), User.Status.ACTIVE);

            System.out.println();

            return userService.addUser(
                    firstName, middleName, lastName,
                    userName, email, phoneNumber, password,
                    centreId, departmentId,
                    role, userType, status
            );
        } catch (Exception e) {
            return "Error: " + e.getMessage();
        }
    }

    @PutMapping("/update/{userId}")
    public ResponseEntity<String> updateUser(
            @PathVariable Long userId,
            @RequestBody Map<String, String> body) {
        trackUsage("/update_user_details", "GET");

            System.out.println("=====================>");
            System.out.println(body);

            String firstName = body.get("firstName");
            String middleName = body.get("middleName");
            String lastName = body.get("lastName");
            String userName = body.get("userName");
            String email = body.get("email");
            String phoneNumber = body.get("phoneNumber");
            String password = body.get("password");

            Long centreId = Long.valueOf(body.get("centreId"));
            Long departmentId = Long.valueOf(body.get("departmentId"));

            User.Role role = body.containsKey("role") ? parseEnumSafely(User.Role.class, body.get("role"), null) : null;
            User.UserType userType = body.containsKey("userType") ? parseEnumSafely(User.UserType.class, body.get("userType"), null) : null;
            User.Status status = body.containsKey("status") ? parseEnumSafely(User.Status.class, body.get("status"), null) : null;

            String result = userService.updateUser(
                    userId, firstName, middleName, lastName,
                    userName, email, phoneNumber, password,
                    centreId, departmentId, role, userType, status
            );

            return ResponseEntity.ok(result);


    }

    private <T extends Enum<T>> T parseEnumSafely(Class<T> enumClass, String value, T defaultValue) {
        try {
            return value != null ? Enum.valueOf(enumClass, value.toUpperCase()) : defaultValue;
        } catch (IllegalArgumentException e) {
            return defaultValue;
        }
    }


    @PostMapping("/change-password")
    public String changePassword(@RequestBody  Map<String, String> Payload) {
        trackUsage("/change_user_password", "GET");
        Long userId = Long.valueOf(Payload.get("userId"));
        String oldPassword = Payload.get("oldPassword");
        String newPassword = Payload.get("newPassword");

        System.out.println(oldPassword + newPassword + userId);
        return userService.changePassword(userId, oldPassword, newPassword);
    }

    @PostMapping("/{id}/permissions")
    public String assignPermissions(@PathVariable Long id, @RequestBody List<Long> permissionIds) {
        return userService.assignPermissions(id, permissionIds);
    }

    @PutMapping("/reset-password/{id}")
    public String resetPassword(@PathVariable Long id) {
        trackUsage("/reset_user_password", "GET");
        return userService.resetPassword(id);
    }

    @PostMapping("/change-role")
    public String changeUserRole(
            @RequestParam Long userId,
            @RequestParam User.Role newRole
    ) {
        trackUsage("/change_role", "GET");
        return userService.changeUserRole(userId, newRole);
    }

    @DeleteMapping("/delete/{userId}")
    public String deleteUser(@PathVariable Long userId) {
        trackUsage("/delete_user", "GET");
        return userService.deleteUser(userId);
    }

    @GetMapping("/profile")
    public ResponseEntity<Optional<User>> getUserProfile(@RequestHeader("Authorization") String token) {
        trackUsage("/get_all_profile", "GET");
        // Extract the token from the "Bearer <token>" format
        String jwt = token.substring(7);

        // Use JwtUtils to extract the username (email) from the token
        String email = jwtService.extractUsername(jwt);

        // Fetch the user profile by email
        Optional<User> user = userService.getUserProfileByEmail(email);

        // Return the user profile
        return ResponseEntity.ok(user);
    }

    private void trackUsage(String endpoint, String method) {

        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String username = (auth != null && auth.isAuthenticated()) ? auth.getName() : "anonymous";

            ApiUsage usage = new ApiUsage();
            usage.setUsername(username);
            usage.setEndpoint("/User management" + endpoint);
            usage.setMethod(method);
            usage.setTimestamp(LocalDateTime.now());

            apiUsageRepository.save(usage);
        } catch (Exception e) {
            e.printStackTrace(); // Logging failure should not break the request
        }
    }

}