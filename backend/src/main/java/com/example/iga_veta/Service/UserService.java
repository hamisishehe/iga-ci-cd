package com.example.iga_veta.Service;


import com.example.iga_veta.Model.Centre;
import com.example.iga_veta.Model.Department;
import com.example.iga_veta.Model.User;
import com.example.iga_veta.Repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PermissionRepository permissionRepository;

    @Autowired
    private RolePermissionRepository rolePermissionRepository;

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private CentreRepository centreRepository;


    @Autowired
    private PasswordEncoder passwordEncoder;

    public List<User> getAllUsers(){
        return userRepository.findAll();
    }

    public User getUserById(Long id){
        Optional<User> user = userRepository.findById(id);
        return user.orElse(null);
    }

    public Optional<User> getUserProfileByUsername(String userName){
        return userRepository.findByUserName(userName);
    }
    
    public Optional<User> getUserProfileByEmail(String email){
        return userRepository.findByEmail(email);
    }

    public String assignPermissions(Long userId, List<Long> permissionIds) {
        var user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        var permissions = permissionRepository.findAllById(permissionIds);
        user.setPermissions(permissions);
        userRepository.save(user);
        return "Permissions assigned successfully";
    }

    public String addUser(
            String firstName,
            String middleName,
            String lastName,
            String userName,
            String email,
            String phoneNumber,
            String password,
            Long centreId,
            Long departmentId,
            String role,
            String userType,
            User.Status status

    ) {

        boolean existByEmail = userRepository.existsByEmail(email);

        if (existByEmail){
            return "Email already exists";
        }


        Department department = departmentRepository.findById(departmentId).orElseThrow();
        Centre centre = centreRepository.findById(centreId).orElseThrow();

        User user = new User();
        user.setFirstName(firstName);
        user.setMiddleName(middleName);
        user.setLastName(lastName);
        user.setUserName(userName);
        user.setEmail(email);
        user.setPhoneNumber(phoneNumber);
        user.setPassword(passwordEncoder.encode(password));
        user.setRole(User.Role.valueOf(role));
        user.setUserType(User.UserType.valueOf(userType));
        user.setStatus(status);
        user.setCentres(centre);
        user.setDepartments(department);

        userRepository.save(user);
        return "User added successfully";
    }



    public String updateUser(
            Long userId,
            String firstName,
            String middleName,
            String lastName,
            String userName,
            String email,
            String phoneNumber,
            String password,
            Long centreId,
            Long departmentId,
            User.Role role,
            User.UserType userType,
            User.Status status
    ) {


        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        // Only update if new value is provided; else keep existing
        if (firstName != null) user.setFirstName(firstName);
        if (middleName != null) user.setMiddleName(middleName);
        if (lastName != null) user.setLastName(lastName);
        if (userName != null) user.setUserName(userName);
        if (email != null) user.setEmail(email);
        if (phoneNumber != null) user.setPhoneNumber(phoneNumber);
        if (password != null) user.setPassword(passwordEncoder.encode(password));
        if (role != null) user.setRole(role);
        if (userType != null) user.setUserType(userType);
        if (status != null) user.setStatus(status);

        // Update relations only if new IDs are provided
        if (centreId != null) {
            Centre centre = centreRepository.findById(centreId)
                    .orElseThrow(() -> new RuntimeException("Centre not found with id: " + centreId));
            user.setCentres(centre);
        }
        if (departmentId != null) {
            Department department = departmentRepository.findById(departmentId)
                    .orElseThrow(() -> new RuntimeException("Department not found with id: " + departmentId));
            user.setDepartments(department);
        }

        userRepository.save(user);
        return "User updated successfully";
    }

    public String changePassword(Long userId, String oldPassword, String newPassword) {

        System.out.println(userId);

        var userOpt = userRepository.findById(userId);

        if (userOpt.isEmpty()) {
            return "User not found";
        }

        User user = userOpt.get();


         if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
             return "Old password is incorrect";
         }


        // user.setPassword(passwordEncoder.encode(newPassword)); // With encryption
        user.setPassword(passwordEncoder.encode(newPassword)); // Without encryption
        userRepository.save(user);

        return "Password changed successfully";
    }

    public String changeUserRole(Long userId, User.Role newRole) {
        var userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return "User not found";
        }

        User user = userOpt.get();
        user.setRole(newRole);
        userRepository.save(user);

        return "User role updated successfully";
    }

    public String resetPassword(Long userId) {
        var userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return "User not found";
        }
        User user = userOpt.get();
        user.setPassword(passwordEncoder.encode("Veta@2026"));
        userRepository.save(user);
        return "Password reset to default successfully";
    }






    public String deleteUser(Long userId) {
        if (!userRepository.existsById(userId)) {
            return "User not found";
        }
        userRepository.deleteById(userId);
        return "User deleted successfully";
    }

    public List<User> getUsersForLoggedInUser(User loggedInUser) {
        if (loggedInUser.getRole() == User.Role.ADMIN) {

            return userRepository.findAll();
        } else {

            Centre centre = loggedInUser.getCentres();
            Department department = loggedInUser.getDepartments();

            return userRepository.findByCentresAndDepartments(centre, department);
        }
    }

}
