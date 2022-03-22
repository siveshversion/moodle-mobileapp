// (C) Copyright 2015 Moodle Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { Component, OnDestroy, OnInit, QueryList, ViewChildren, ViewEncapsulation } from '@angular/core';
import { IonRefresher } from '@ionic/angular';

import { CoreCourses, CoreCoursesProvider } from '../../services/courses';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreSites } from '@services/sites';
import { CoreCoursesDashboard } from '@features/courses/services/dashboard';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreCourseBlock } from '@features/course/services/course';
import { CoreBlockComponent } from '@features/block/components/block/block';
import { CoreNavigator } from '@services/navigator';
import { ApiService } from '@/api.service';
import { Router } from '@angular/router';
import { Network } from '@ionic-native/network';
import { CoreCourseOptionsDelegate } from '@features/course/services/course-options-delegate';
import { CoreEnrolledCourseDataWithExtraInfoAndOptions, CoreCoursesHelper } from '@features/courses/services/courses-helper';

/**
 * Page that displays the dashboard page.
 */
@Component({
    selector: 'page-core-courses-dashboard',
    templateUrl: 'dashboard.html',
    styleUrls: ['dashboard.scss'],
    providers: [ApiService, Network],
    encapsulation: ViewEncapsulation.None
})
export class CoreCoursesDashboardPage implements OnInit, OnDestroy {

    @ViewChildren(CoreBlockComponent) blocksComponents?: QueryList<CoreBlockComponent>;

    searchEnabled = false;
    downloadEnabled = false;
    downloadCourseEnabled = false;
    downloadCoursesEnabled = false;
    downloadEnabledIcon = 'far-square';
    userId?: number;
    blocks: Partial<CoreCourseBlock>[] = [];
    loaded = false;

    //custom variables
    Points = 0;
    TotalCourses = 0;
    NotStartedCourses = 0;
    InProgressCourses = 0;
    CompletedCourses = 0;
    total_certifications = 0;
    total_points = 0;
    redeemed_points = 0;
    balance_points = 0;

    UserData = [];
    PointsDetails: any;
    CompletedCourseIds : number[] = [];


    count_1 = 0;
    count_2 = 0;
    count_3 = 0;
    count_4 = 0;
    count_5 = 0;
    count_6 = 0;
    count_7 = 0;
    completed_count_1 = 0;
    completed_count_2 = 0;
    completed_count_3 = 0;
    completed_count_4 = 0;
    completed_count_5 = 0;
    completed_count_6 = 0;
    completed_count_7 = 0;
    completed_count_per_1 = 0;
    completed_count_per_2 = 0;
    completed_count_per_3 = 0;
    completed_count_per_4 = 0;
    completed_count_per_5 = 0;
    completed_count_per_6 = 0;
    completed_count_per_7 = 0;

    siteInfo: any;
    siteName!: string;
    siteUrl!: string;

    protected updateSiteObserver?: CoreEventObserver;
    courseIds: string | undefined;
    courses!: CoreEnrolledCourseDataWithExtraInfoAndOptions[];
    filteredCourses: any;
    filter!: string;
    coursesLoaded = false;


    constructor(public apiProvider: ApiService, public router: Router) { }

    /**
     * Initialize the component.
     */
    ngOnInit(): void {
        this.searchEnabled = !CoreCourses.isSearchCoursesDisabledInSite();
        this.downloadCourseEnabled = !CoreCourses.isDownloadCourseDisabledInSite();
        this.downloadCoursesEnabled = !CoreCourses.isDownloadCoursesDisabledInSite();


        this.fetchCourses().finally(() => {
            this.coursesLoaded = true;
        });

        // Refresh the enabled flags if site is updated.
        this.updateSiteObserver = CoreEvents.on(CoreEvents.SITE_UPDATED, () => {
            this.searchEnabled = !CoreCourses.isSearchCoursesDisabledInSite();
            this.downloadCourseEnabled = !CoreCourses.isDownloadCourseDisabledInSite();
            this.downloadCoursesEnabled = !CoreCourses.isDownloadCoursesDisabledInSite();

            this.switchDownload(this.downloadEnabled && this.downloadCourseEnabled && this.downloadCoursesEnabled);
        }, CoreSites.getCurrentSiteId());

        this.loadContent();

        this.loadSiteInfo();
        this.loadPoints(CoreSites.getCurrentSite()!.getUserId());
    }

    /**
     * Convenience function to fetch the dashboard data.
     *
     * @return Promise resolved when done.
     */
    protected async loadContent(): Promise<void> {
        const available = await CoreCoursesDashboard.isAvailable();

        if (available) {
            this.userId = CoreSites.getCurrentSiteUserId();

            try {
                this.blocks = await CoreCoursesDashboard.getDashboardBlocks();
            } catch (error) {
                CoreDomUtils.showErrorModal(error);

                // Cannot get the blocks, just show dashboard if needed.
                this.loadFallbackBlocks();
            }
        } else if (!CoreCoursesDashboard.isDisabledInSite()) {
            // Not available, but not disabled either. Use fallback.
            this.loadFallbackBlocks();
        } else {
            // Disabled.
            this.blocks = [];
        }

        // this.dashboardEnabled = this.blockDelegate.hasSupportedBlock(this.blocks);
        this.loaded = true;
    }

    /**
     * Load fallback blocks to shown before 3.6 when dashboard blocks are not supported.
     */
    protected loadFallbackBlocks(): void {
        this.blocks = [
            {
                name: 'myoverview',
                visible: false,
            },
            {
                name: 'timeline',
                visible: false,
            },
        ];
    }

    /**
     * Refresh the dashboard data.
     *
     * @param refresher Refresher.
     */
    refreshDashboard(refresher: IonRefresher): void {


        this.refreshCourses(refresher);

        const promises: Promise<void>[] = [];

        promises.push(CoreCoursesDashboard.invalidateDashboardBlocks());

        // Invalidate the blocks.
        this.blocksComponents?.forEach((blockComponent) => {
            promises.push(blockComponent.invalidate().catch(() => {
                // Ignore errors.
            }));
        });

        Promise.all(promises).finally(() => {
            this.loadContent().finally(() => {
                refresher?.complete();
            });
        });
    }

    /**
     * Toggle download enabled.
     */
    toggleDownload(): void {
        this.switchDownload(!this.downloadEnabled);
    }

    /**
     * Convenience function to switch download enabled.
     *
     * @param enable If enable or disable.
     */
    protected switchDownload(enable: boolean): void {
        this.downloadEnabled = (this.downloadCourseEnabled || this.downloadCoursesEnabled) && enable;
        this.downloadEnabledIcon = this.downloadEnabled ? 'far-check-square' : 'far-square';
        CoreEvents.trigger(CoreCoursesProvider.EVENT_DASHBOARD_DOWNLOAD_ENABLED_CHANGED, { enabled: this.downloadEnabled });
    }

    /**
     * Open page to manage courses storage.
     */
    manageCoursesStorage(): void {
        CoreNavigator.navigateToSitePath('/storage');
    }

    /**
     * Go to search courses.
     */
    async openSearch(): Promise<void> {
        CoreNavigator.navigateToSitePath('/courses/search');
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        this.updateSiteObserver?.off();
    }


    //custom changes

    loadPoints(userid: number) {

        this.Points = 0;
        this.total_certifications = 0;
        this.apiProvider.getCoursePoints(true).subscribe(res => {
            this.PointsDetails = res;
            this.PointsDetails.forEach((coursepoint: any) => {
                this.Points = Number(this.Points) + Number(coursepoint.points);
            });

            this.apiProvider.updateUserPoints(userid, this.Points);
            this.apiProvider.getUserData(userid);


        });

        this.apiProvider.getUserData(userid)?.subscribe(res => {
            this.UserData = res;
            this.UserData.forEach((user: any) => {
                this.total_certifications = user.total_certifications;
                this.total_points = user.total_points;
                this.redeemed_points = user.redeemed_points;
                this.balance_points = user.balance_points;
            });
        });

    }

    protected async loadSiteInfo(): Promise<void> {
        const currentSite = CoreSites.getCurrentSite();

        if (!currentSite) {
            return;
        }

        this.siteInfo = currentSite.getInfo();
        this.siteName = currentSite.getSiteName();
        this.siteUrl = currentSite.getURL();


    }

    gotocourses(categoryId: number): void {
        CoreNavigator.navigateToSitePath('courses/categories/' + categoryId);
    }


    /**
 * Fetch the user courses.
 *
 * @return Promise resolved when done.
 */
    protected async fetchCourses(): Promise<void> {
        try {
            const courses: CoreEnrolledCourseDataWithExtraInfoAndOptions[] = await CoreCourses.getUserCourses();
            const courseIds = courses.map((course) => course.id);

            this.courseIds = courseIds.join(',');

            await CoreCoursesHelper.loadCoursesExtraInfo(courses);

            if (CoreCourses.canGetAdminAndNavOptions()) {
                const options = await CoreCourses.getCoursesAdminAndNavOptions(courseIds).then((options) => {
                    this.CompletedCourseIds = [];
                    courses.forEach((course) => {

                        //calculating course count for a category - Start
                        if (course.categoryid != 8) {
                            this.TotalCourses = this.TotalCourses + 1;
                            if (course.progress == 100) {
                                this.CompletedCourseIds.push(course.id);
                            }

                            if (course.categoryid == 1) {
                                this.count_1 = this.count_1 + 1;
                                if (course.progress == 100) {
                                    this.completed_count_1 = this.completed_count_1 + 1;
                                }
                            }
                            if (course.categoryid == 2) {
                                this.count_2 = this.count_2 + 1;
                                if (course.progress == 100) {
                                    this.completed_count_2 = this.completed_count_2 + 1;
                                }
                            }
                            if (course.categoryid == 3) {
                                this.count_3 = this.count_3 + 1;
                                if (course.progress == 100) {
                                    this.completed_count_3 = this.completed_count_3 + 1;
                                }
                            }
                            if (course.categoryid == 4) {

                                this.count_4 = this.count_4 + 1;
                                //console.log('Percentage'+course.percentage);
                                if (course.progress == 100) {
                                    this.completed_count_4 = this.completed_count_4 + 1;
                                }
                            }
                            if (course.categoryid == 5) {
                                this.count_5 = this.count_5 + 1;
                                if (course.progress == 100) {
                                    this.completed_count_5 = this.completed_count_5 + 1;
                                }
                            }
                            if (course.categoryid == 6) {
                                this.count_6 = this.count_6 + 1;
                                if (course.progress == 100) {
                                    this.completed_count_6 = this.completed_count_6 + 1;
                                }
                            }
                            if (course.categoryid == 7) {
                                this.count_7 = this.count_7 + 1;
                                if (course.progress == 100) {
                                    this.completed_count_7 = this.completed_count_7 + 1;
                                }
                            }

                            //calculating course count for a category - End                            
                            if (course.lastaccess == null) {

                                this.NotStartedCourses = this.NotStartedCourses + 1;
                            }
                            if (course.progress == 100) {
                                this.CompletedCourses = this.CompletedCourses + 1;
                                //this.Points = this.Points + 100;
                            }
                            this.InProgressCourses = this.TotalCourses - (this.NotStartedCourses + this.CompletedCourses);

                            course.navOptions = options.navOptions[course.id];
                            course.admOptions = options.admOptions[course.id];
                        }
                        if (this.count_1 > 0) {
                            this.completed_count_per_1 = (this.completed_count_1 / this.count_1) * 100;
                        }
                        if (this.count_2 > 0) {
                            this.completed_count_per_2 = (this.completed_count_2 / this.count_2) * 100;
                        }
                        if (this.count_3 > 0) {
                            this.completed_count_per_3 = (this.completed_count_3 / this.count_3) * 100;
                        }

                        if (this.count_4 > 0) {
                            this.completed_count_per_4 = (this.completed_count_4 / this.count_4) * 100;
                        }
                        if (this.count_5 > 0) {
                            this.completed_count_per_5 = (this.completed_count_5 / this.count_5) * 100;
                        }
                        if (this.count_6 > 0) {
                            this.completed_count_per_6 = (this.completed_count_6 / this.count_6) * 100;
                        }
                        if (this.count_7 > 0) {
                            this.completed_count_per_7 = (this.completed_count_7 / this.count_7) * 100;
                        }
                    });
                });
            }

            this.courses = courses;
            this.filteredCourses = this.courses;
            this.filter = '';
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'core.courses.errorloadcourses', true);
        }
    }

    /**
     * Refresh the courses.
     *
     * @param refresher Refresher.
     */
    refreshCourses(refresher: IonRefresher): void {
        this.Points = 0;
        this.TotalCourses = 0;
        this.NotStartedCourses = 0;
        this.InProgressCourses = 0;
        this.CompletedCourses = 0;
        this.count_1 = 0;
        this.count_2 = 0;
        this.count_3 = 0;
        this.count_4 = 0;
        this.count_5 = 0;
        this.count_6 = 0;
        this.count_7 = 0;
        this.completed_count_1 = 0;
        this.completed_count_2 = 0;
        this.completed_count_3 = 0;
        this.completed_count_4 = 0;
        this.completed_count_5 = 0;
        this.completed_count_6 = 0;
        this.completed_count_7 = 0;
        this.completed_count_per_1 = 0;
        this.completed_count_per_2 = 0;
        this.completed_count_per_3 = 0;
        this.completed_count_per_4 = 0;
        this.completed_count_per_5 = 0;
        this.completed_count_per_6 = 0;
        this.completed_count_per_7 = 0;

        const promises: Promise<void>[] = [];

        promises.push(CoreCourses.invalidateUserCourses());
        promises.push(CoreCourseOptionsDelegate.clearAndInvalidateCoursesOptions());
        if (this.courseIds) {
            promises.push(CoreCourses.invalidateCoursesByField('ids', this.courseIds));
        }

        Promise.all(promises).finally(() => {
            this.fetchCourses().finally(() => {
                refresher?.complete();
            });
        });
    }

}
