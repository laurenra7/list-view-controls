import { ReactNode, SFC, createElement } from "react";

import { BreakView } from "./BreakView";
import { PageNumberButton } from "./PageNumberButton";

export interface PageNumberViewProps {
    maxPageButtons: number;
    pageCount: number;
    selectedPageNumber: number;
    onClickAction: (pageNumber: number) => void;
}

export const PageNumberView: SFC<PageNumberViewProps> = (props) => {
    const pageItems: ReactNode[] = [];
    const { selectedPageNumber, onClickAction } = props;
    if (props.pageCount <= props.maxPageButtons) {
        for (let pageNumber = 1; pageNumber <= props.pageCount; pageNumber++) {
            pageItems.push(createElement(PageNumberButton, { pageNumber, totalPages: props.pageCount, selectedPageNumber, onClickAction: onClickAction.bind(null, pageNumber), key: `page${pageNumber}` }));
        }
    } else {
        const leftBreakpoint = Math.ceil(props.maxPageButtons / 2);
        const rightBreakpoint = Math.floor(props.maxPageButtons / 2);
        const hasLeftDivider = props.selectedPageNumber > leftBreakpoint;
        const hasRightDivider = props.selectedPageNumber < (props.pageCount - rightBreakpoint);
        let leftButtonNumber = 1;
        let rightButtonNumber = 1;
        if (!hasLeftDivider && hasRightDivider) {
            // [first] [left] _ _ _ [right] [...] [last]
            leftButtonNumber = 1 + 1; // first
            rightButtonNumber = props.maxPageButtons - 2; // divider, last
        } else if (hasLeftDivider && hasRightDivider) {
            // [first] [...] [left] _ _ _ [right] [...] [last]
            const leftOfSelected = Math.floor((props.maxPageButtons - 4) / 2); // first, divider, divider, last
            const rightOfSelected = Math.ceil((props.maxPageButtons - 4) / 2) - 1; // first, divider, divider, last, selected
            leftButtonNumber = props.selectedPageNumber - leftOfSelected;
            rightButtonNumber = props.selectedPageNumber + rightOfSelected;
        } else if (hasLeftDivider && !hasRightDivider) {
            // [first] [...] [left] _ _ _ [right] [last]
            leftButtonNumber = props.pageCount - (props.maxPageButtons - 3) ; // first, divider, last
            rightButtonNumber = props.pageCount - 1; // last
        }
        // Add first page button
        pageItems.push(createElement(PageNumberButton, { pageNumber: 1, totalPages: props.pageCount, selectedPageNumber, onClickAction: onClickAction.bind(null, 1), key: "first" }));
        if (hasLeftDivider) {
            pageItems.push(createElement(BreakView, { key: "leftDivider" }));
        }
        // Add middle page buttons
        for (let pageNumber = leftButtonNumber; pageNumber <= rightButtonNumber; pageNumber++) {
            pageItems.push(createElement(PageNumberButton, { pageNumber, totalPages: props.pageCount, selectedPageNumber, onClickAction: onClickAction.bind(null, pageNumber), key: `page${pageNumber}` }));
        }
        if (hasRightDivider) {
            pageItems.push(createElement(BreakView, { key: "rightDivider" }));
        }
        // Add last page button
        pageItems.push(createElement(PageNumberButton, { pageNumber: props.pageCount, totalPages: props.pageCount, selectedPageNumber, onClickAction: onClickAction.bind(null, props.pageCount), key: "last" }));
    }

    return createElement("ul", {}, pageItems);
};
