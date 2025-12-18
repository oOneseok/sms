package com.example.sms.controller;

import com.example.sms.dto.MenuResponseDto;
import com.example.sms.repository.MenuRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/menus")
@RequiredArgsConstructor
public class MenuController {

    private final MenuRepository menuRepository;

    @GetMapping
    public List<MenuResponseDto> getMenuList() {
        return menuRepository.findAllByParentIsNullOrderBySeqNoAsc().stream()
                .map(MenuResponseDto::new)
                .collect(Collectors.toList());
    }
}