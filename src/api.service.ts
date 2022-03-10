import { CoreApp } from './core/services/app';
import { Injectable, NgZone } from '@angular/core';
import { Network } from '@ionic-native/network';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { tap, map } from "rxjs/operators";
import { Observable } from 'rxjs';
import { CoreSites } from '@services/sites';
import { NULL_EXPR } from '@angular/compiler/src/output/output_ast';

const API_STORAGE_KEY = 'specialkey';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  constructor(public http: HttpClient, network: Network, zone: NgZone) { }

  getCoursePoints(forceRefresh: boolean = false): Observable<any[]> {

      const currentSite = CoreSites.getCurrentSite()!,
        currentSiteUrl = currentSite.getURL();

      return this.http.get(currentSiteUrl + '/api/methods.php?methodname=getCoursePoints').pipe(

        map(res => res['Data']),
        tap(res => {

        })
      )
  }




  getUserData(userid: any) {

    if (CoreApp.isOnline()) {
      const httpOptions = {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        })
      };

      let postData = {
        "userid": userid
      }

      if (CoreApp.isOnline()) {
        return this.http.post('https://sony.learnospace.com/api/methods.php?methodname=getUserData', JSON.stringify(postData), httpOptions).pipe(
          map(res => res['Data']),
          tap(res => {

            console.log(res);
          }, error => {
            console.log(error);
          })
        )
      }
    } else {
      alert('Please check your internet connection');

    }
  }


  updateUserPoints(userid: any, points: any) {
    if (CoreApp.isOnline()) {
      const httpOptions = {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        })
      };


      let postData = {
        "userid": userid,
        "points": points
      }

      this.http.post("https://sony.learnospace.com/api/methods.php?methodname=updateUserPoints", JSON.stringify(postData), httpOptions)
        .subscribe(data => {
          console.log(data);
        }, error => {
          console.log(error);
        });
    } else {

      alert('Please check your internet connection');
    }
  }


}