import { ListView, OfflineConstraint, SharedUtils } from "../SharedUtils";
import "./ui/DataSourceHelper.scss";

interface ConstraintStore {
    constraints: { [group: string]: { [widgetId: string]: string | OfflineConstraint; } };
    sorting: { [widgetId: string]: string[] };
}

interface DataSourceHelperListView extends ListView {
    __customWidgetDataSourceHelper?: DataSourceHelper;
}

export class DataSourceHelper {
    private initialLoad = true;
    private delay = 50;
    private timeoutHandle?: number;
    private store: ConstraintStore = { constraints: { _none: {} }, sorting: {} };
    private widget: DataSourceHelperListView;
    private updateInProgress = false;
    private requiresUpdate = false;

    constructor(widget: DataSourceHelperListView) {
        this.widget = widget;
    }

    static getInstance(widgetParent: HTMLElement, widgetEntity?: string) {
        const widget = SharedUtils.findTargetListView(widgetParent, widgetEntity) as DataSourceHelperListView;
        const compatibilityMessage = SharedUtils.validateCompatibility({ listViewEntity: widgetEntity, targetListView: widget });

        if (!compatibilityMessage) {
            if (!widget.__customWidgetDataSourceHelper) {
                widget.__customWidgetDataSourceHelper = new DataSourceHelper(widget);
            }
            widget.__customWidgetDataSourceHelper.initialLoad = true;
            this.hideContent(widget.domNode);

            return widget.__customWidgetDataSourceHelper;
        }

        throw new Error(compatibilityMessage);
    }

    setSorting(widgetId: string, sortConstraint: string[]) {
        this.store.sorting = {} ;
        this.store.sorting[widgetId] = sortConstraint;
        this.registerUpdate();
    }

    setConstraint(widgetId: string, constraint: string | OfflineConstraint, groupName = "_none") {
        const group = groupName.trim() || "_none";
        if (this.store.constraints[group]) {
            this.store.constraints[group][widgetId] = constraint;
        } else {
            this.store.constraints[group] = { [widgetId] : constraint };
        }
        this.registerUpdate();
    }

    getListView(): ListView {
        return this.widget as ListView;
    }

    private registerUpdate() {
        if (this.timeoutHandle) {
            window.clearTimeout(this.timeoutHandle);
        }
        if (!this.updateInProgress) {
            this.timeoutHandle = window.setTimeout(() => {
                this.updateInProgress = true;
                // TODO Check if there's currently no update happening on the listView coming from another
                // Feature/functionality/widget which does not use DataSourceHelper
                this.iterativeUpdateDataSource();
          }, this.delay);
        } else {
            this.requiresUpdate = true;
        }
    }

    private iterativeUpdateDataSource() {
        this.updateDataSource(() => {
            if (this.requiresUpdate) {
                this.requiresUpdate = false;
                this.iterativeUpdateDataSource();
            } else {
                this.updateInProgress = false;
            }
        });
    }

    private updateDataSource(callback: () => void) {
        let constraints: OfflineConstraint[] | string;
        const sorting: string[][] = Object.keys(this.store.sorting)
            .map(key => this.store.sorting[key])
            .filter(sortConstraint => sortConstraint[0] && sortConstraint[1]);

        if (window.mx.isOffline()) {
            // TODO implement OR groups for offline
            constraints = Object.keys(this.store.constraints)
                .map(key => this.store.constraints[key].constraint as OfflineConstraint)
                .filter(mobileConstraint => mobileConstraint.value);
        } else {
            const noneGroupedConstraints = Object.keys(this.store.constraints._none)
            .map(key => this.store.constraints._none[key])
            .join("");

            const groupedConstraints = Object.keys(this.store.constraints)
                .filter(c => c !== "_none")
                .map(group => "[" + Object.keys(this.store.constraints[group])
                    .map(key => this.store.constraints[group][key] as string)
                    .filter(c => c) // Remove empty
                    .map(c => c.trim().substr(1, c.trim().length - 2)) // Strip []
                    .join(" or ") + "]")
                .join("")
                .replace(/\[]/g, ""); // Remove empty string "[]"

            constraints = noneGroupedConstraints + groupedConstraints;
        }

        this.widget._datasource._constraints = constraints;
        this.widget._datasource._sorting = sorting;

        if (!this.initialLoad) {
            this.showLoader();
        }

        this.widget.update(null, () => {
           this.hideLoader();
           this.initialLoad = false;
           callback();
        });
    }

    private showLoader() {
        this.widget.domNode.classList.add("widget-data-source-helper-loading");
    }

    static hideContent(targetNode?: HTMLElement) {
        if (targetNode) {
            targetNode.classList.add("widget-data-source-helper-initial-loading");
        }
    }

    static showContent(targetNode?: HTMLElement) {
        if (targetNode) {
            targetNode.classList.remove("widget-data-source-helper-initial-loading");
        }
    }

    private hideLoader() {
        this.widget.domNode.classList.remove("widget-data-source-helper-loading");
        DataSourceHelper.showContent(this.widget.domNode);
    }
}
