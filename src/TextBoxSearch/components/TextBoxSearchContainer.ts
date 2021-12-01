import { Component, ReactNode, createElement } from "react";
import * as classNames from "classnames";

import { Alert } from "../../Shared/components/Alert";
import { DataSourceHelper } from "../../Shared/DataSourceHelper/DataSourceHelper";
import { GroupedOfflineConstraint, SharedUtils, WrapperProps } from "../../Shared/SharedUtils";

import { TextBoxSearch } from "./TextBoxSearch";
import { Validate } from "../Validate";
import { SharedContainerUtils } from "../../Shared/SharedContainerUtils";
import { FormViewState } from "../../Shared/FormViewState";

export interface ContainerProps extends WrapperProps {
    attributeList: SearchAttributes[];
    queryLocation: QueryLocation;
    defaultQuery: string;
    defaultQueryEntity: string;
    defaultQueryAttribute: string;
    entity: string;
    placeHolder: string;
}

type QueryLocation = "none" | "text" | "attribute";

export interface SearchAttributes {
    attribute: string;
}

export interface ContainerState {
    alertMessage?: ReactNode;
    listViewAvailable: boolean;
    searchText: string;
}

interface FormState {
    defaultSearchText?: string;
}

export default class SearchContainer extends Component<ContainerProps, ContainerState> {
    private dataSourceHelper?: DataSourceHelper;
    private widgetDom: Element | null = null;
    private viewStateManager: FormViewState<FormState>;
    private retriesFind = 0;

    constructor(props: ContainerProps) {
        super(props);

        this.applySearch = this.applySearch.bind(this);

        this.viewStateManager = new FormViewState(this.props.mxform, this.props.uniqueid, viewState => {
            viewState.defaultSearchText = this.state.searchText;
        });

        this.state = {
            alertMessage: Validate.validateProps(this.props),
            searchText: this.getDefaultValue(),
            listViewAvailable: false
        };

    }

    render() {
        return createElement("div", {
                className: classNames("widget-text-box-search", this.props.class),
                ref: widgetDom => this.widgetDom = widgetDom,
                style: SharedUtils.parseStyle(this.props.style)
            },
            createElement(Alert, {
                className: "widget-text-box-search-alert"
            }, this.state.alertMessage),
            this.renderTextBoxSearch()
        );
    }

    componentDidMount() {
        SharedUtils.delay(this.connectToListView.bind(this), this.checkListViewAvailable.bind(this), 20);
    }

    componentDidUpdate(_prevProps: ContainerProps, prevState: ContainerState) {
        if (this.state.listViewAvailable && !prevState.listViewAvailable) {
            this.applySearch(this.state.searchText);
        }
    }

    private checkListViewAvailable(): boolean {
        if (!this.widgetDom) {
            return false;
        }
        this.retriesFind++;
        if (this.retriesFind > 25) {
            return true; // Give-up searching
        }

        return !!SharedContainerUtils.findTargetListView(this.widgetDom.parentElement, this.props.entity);
    }

    private renderTextBoxSearch(): ReactNode {
        if (!this.state.alertMessage) {
            return createElement(TextBoxSearch, {
                defaultQuery: this.state.searchText,
                onTextChange: this.applySearch,
                placeholder: this.props.placeHolder
            });
        }

        return null;
    }

    private applySearch(searchQuery: string) {
        const constraint = this.getConstraint(mxui.dom.escapeHTMLQuotes(searchQuery));

        if (this.dataSourceHelper) {
            this.dataSourceHelper.setConstraint(this.props.uniqueid, constraint);
        }
        this.setState({ searchText: searchQuery });
    }

    private getConstraint(searchQuery: string): string | GroupedOfflineConstraint {

        searchQuery = searchQuery.trim();

        if (!searchQuery) {
            return "";
        }
        const meta = mx.meta.getEntity(this.props.entity);

        if (window.mx.isOffline()) {
            const offlineConstraints: mendix.lib.dataSource.OfflineConstraint[] = [];
            this.props.attributeList.forEach(search => {
                if (meta.isEnum(search.attribute)) {
                    const enumCaptionMatches = this.matchEnumCaptions(meta, search, searchQuery);

                    if (enumCaptionMatches.length > 0) {
                        enumCaptionMatches.forEach(match => offlineConstraints.push({
                            attribute: search.attribute,
                            operator: "contains",
                            path: this.props.entity,
                            value: match
                        }));
                    } else {
                        offlineConstraints.push({
                            attribute: search.attribute,
                            operator: "contains",
                            path: this.props.entity,
                            value: " "
                        });
                    }
                } else {
                    offlineConstraints.push({
                        attribute: search.attribute,
                        operator: "contains",
                        path: this.props.entity,
                        value: searchQuery
                    });
                }
            });
            // todo check of empty search for offline
            return {
                constraints: offlineConstraints,
                operator: "or"
            };
        }

        const constraints: string[] = [];
        this.props.attributeList.forEach(searchAttribute => {
            if (meta.isEnum(searchAttribute.attribute)) {
                const enumCaptionMatches = this.matchEnumCaptions(meta, searchAttribute, searchQuery);

                if (enumCaptionMatches.length > 0) {
                    enumCaptionMatches.forEach(match => constraints.push(`${searchAttribute.attribute}='${match}'`));
                } else {
                    constraints.push(`contains(${searchAttribute.attribute}," ")`);
                }
            } else {
                constraints.push(`contains(${searchAttribute.attribute},'${searchQuery}')`);
            }
        });

        return "[" + constraints.join(" or ") + "]";
    }

    private matchEnumCaptions(meta: mendix.lib.MxMetaObject, search: SearchAttributes, searchQuery: string) {
        return meta.getEnumMap(search.attribute)
            .reduce<string[]>((prev, current) => {
                if (current.caption.match(new RegExp(searchQuery, "i"))) {
                    prev.push(current.key);
                }
                return prev;
            }, []);
    }

    private connectToListView() {
        let alertMessage = "";

        try {
            this.dataSourceHelper = DataSourceHelper.getInstance(this.widgetDom, this.props.entity);
        } catch (error) {
            alertMessage = error.message;
        }

        this.setState({
            alertMessage: alertMessage || Validate.validateProps(this.props),
            listViewAvailable: !alertMessage
        });
    }

    private getDefaultValue(): string {
        console.log("TextBoxSearchContainer, get props.defaultQueryEntity: " + this.props.defaultQueryEntity); // testing only
        console.log("TextBoxSearchContainer, get props.defaultQueryAttribute: " + this.props.defaultQueryAttribute); // testing only
        return this.viewStateManager.getPageState("defaultSearchText", this.props.defaultQuery);
    }

}
