package com.iflytek.astron.console.hub.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Generic pagination response DTO corresponding to pagination return structure in legacy code
 *
 * @author Omuigix
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PageResponse<T> {

    /**
     * Current page number
     */
    private Integer page;

    /**
     * Page size
     */
    private Integer size;

    /**
     * Total record count
     */
    private Long total;

    /**
     * Total page count
     */
    private Integer totalPages;

    /**
     * Data list
     */
    private List<T> records;

    /**
     * Whether there is a next page
     */
    private Boolean hasNext;

    /**
     * Whether there is a previous page
     */
    private Boolean hasPrevious;

    /**
     * Construct pagination response
     */
    public static <T> PageResponse<T> of(Integer page, Integer size, Long total, List<T> records) {
        PageResponse<T> response = new PageResponse<>();
        response.setPage(page);
        response.setSize(size);
        response.setTotal(total);
        response.setRecords(records);

        // Calculate total pages
        int totalPages = (int) Math.ceil((double) total / size);
        response.setTotalPages(totalPages);

        // Calculate whether there are previous/next pages
        response.setHasNext(page < totalPages);
        response.setHasPrevious(page > 1);

        return response;
    }

    /**
     * Empty result
     */
    public static <T> PageResponse<T> empty(Integer page, Integer size) {
        return of(page, size, 0L, List.of());
    }
}
