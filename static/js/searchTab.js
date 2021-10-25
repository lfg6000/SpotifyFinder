  var vSearchTable;
  var vLastPlSelectionCntrSearchTab = 0;
  var vSearchTableLastSearchCol = '';
  var vSearchTabLoading = false;

  var vCbxTrackNameVal = false;
  var vCbxArtistNameVal = false;
  var vCbxAlbumNameVal = false;
  var vCbxPlaylistNameVal = false;
  var vCbxDurationHmsVal = false;
  var vCbxTrackIdVal = false;

  var vSearchText = '';


  //-----------------------------------------------------------------------------------------------
  function searchTab_init(tableHeight=300)
  {
    // console.log("searchTab_initPlTab() - searchTable ready()");

    // after a refresh put the radio btns back into the initial state (needed for firefox)
    $(rPlModeAcross).prop('checked',true);
    $(rPlSearchId).prop('checked',true);

    // must be before table creation
    // add search input boxes to the dom at the bottom of the desired columns
    let ftIdx = 0;
    $('#searchTable tfoot th').each(function()
    {
      if (ftIdx === 0)
      {
        $(this).html('<button onclick="searchTab_btnClearSearchPlOnClick()" class="btnClrSearch" title="Clear search">x</button>');
      }
      if (ftIdx !== 0)
      {
        let ibName = 'searchColSearchIB' + ftIdx;
        $(this).html('<input type="text" name="' + ibName + '" placeholder="Search"/>');
      }
      ftIdx += 1;
    } );

    vSearchTable = $('#searchTable').DataTable(
    {
      "fnRowCallback": function(nRow, rowData)
      {
          if (rowData[11] != vUserId)   // playlistOwnerId != vUserId
            $('td:eq(0)', nRow).addClass('disabledCkBx');
      },

      initComplete: function()  //col search: https://datatables.net/examples/api/multi_filter.html
      {
        this.api().columns().every(function()
        {
          let that = this;
          $('input', this.footer()).on('keyup change clear', function()
          {
            if (that.search() !== this.value)
            {
              vSearchTableLastSearchCol = this.name;
              that.search(this.value)
              that.draw();
            }
          });
        });
      },

      // dom default: lfrtip; ('r', 't' provides processing, table) (no 'f, 'p', 'i' removes search btn, paging info)
      "dom":            "rt",
      "scrollY":         tableHeight - 85,  // compensate for extra height for radio btns that the other tabs do not have
      "scrollCollapse":  false,
      "paging":          false,
      "orderClasses":    false, // background color of sorted column does not change
      "order":           [],
      columnDefs: [ { targets:  0, className: 'select-checkbox', orderable: false },
                    { targets:  9, visible: false, searchable: false },
                    { targets: 10, visible: false, searchable: false },
                    { targets: 11, visible: false, searchable: false }],
      select: { style: 'multi' }
    });
  }

  //-----------------------------------------------------------------------------------------------
  function searchTab_redraw()
  {
    // console.log('__SF__searchTab_redraw()');
    vSearchTable.columns.adjust().draw();
  }

  //-----------------------------------------------------------------------------------------------
  async function searchTab_afActivate(curPlSelectionCntr)
  {
    try
    {
      // console.log('__SF__searchTab_activate()');
      // console.log('__SF__searchTab_activate() - lastCnt = ' + vLastPlSelectionCntrSearchTab + ', curCnt = ' + curPlSelectionCntr);

      // if you click "Playlists selected on this tab determines..." at the bottom of the plTab load times for each tab will be displayed (for dbg)
      let t0;
      if (vShowExeTm == 1)
      {
        $("#searchTab_ExeTm").text(0);
        t0 = Date.now();
      }

      if (vLastPlSelectionCntrSearchTab !== curPlSelectionCntr)
      {
        vLastPlSelectionCntrSearchTab = curPlSelectionCntr;
        vSearchTabLoading = true;

        // this works better if the clear tables are here instead of being inside async calls
        // we are reloading both tables so we empty them out
        vSearchTable.clear().draw();
        $('#searchTab_cbMvCpDest').empty();

        // console.log('__SF__searchTab_afActivate() - start loading');
        $("#searchTab_info3").text('');
        tabs_set2Labels('searchTab_info1', 'Loading...', 'searchTab_info2', 'Loading...');
        tabs_progBarStart('searchTab_progBar', 'searchTab_progStat1', 'Loading Tracks...', showStrImmed=true);

        $('#searchTab_cbMvCpDest').append($('<option>', { value: '0::::str2', text : cbMvDestDefault }));

        await tracksTab_afLoadPlTracks();
        await searchTab_afLoadSearchTable();

        if (vShowExeTm == 1)
        {
          exeTm = Math.floor((Date.now() - t0) / 1000);
          $("#searchTab_ExeTm").text(exeTm);
        }
        // console.log('__SF__searchTab_afActivate() - loading done - exit');
      }
    }
    catch(err)
    {
      // console.log('__SF__searchTab_afActivate() caught error: ', err);
      tabs_errHandler(err);
    }
    finally
    {
      // console.log('__SF__searchTab_afActivate() finally.');
      vSearchTabLoading = false;
      tabs_progBarStop('searchTab_progBar', 'searchTab_progStat1', '');
    }
  }

  //-----------------------------------------------------------------------------------------------
  async function searchTab_afLoadSearchTableSeq()
  {
    try
    {
      // console.log("searchTab_afLoadSearchTableSeq()");
      vSearchTabLoading = true;
      tabs_set2Labels('searchTab_info1', 'Loading...', 'searchTab_info2', 'Loading...');
      tabs_progBarStart('searchTab_progBar', 'searchTab_progStat1', 'Searching...', showStrImmed=true);

      vSearchTable.order([]); // remove sorting
      vSearchTable.clear().draw();
      await searchTab_afLoadSearchTable();
    }
    catch(err)
    {
      // console.log('__SF__searchTab_afLoadSearchTableSeq() caught error: ', err);
      tabs_errHandler(err);
    }
    finally
    {
      // console.log('__SF__searchTab_afLoadSearchTableSeq() finally.');
      vSearchTabLoading = false;
      tabs_progBarStop('searchTab_progBar', 'searchTab_progStat1', '');
    }
  }

  //-----------------------------------------------------------------------------------------------
  async function searchTab_afClearSearchTrackListSeq()
  {
    try
    {
      // console.log("__SF__searchTab_afClearSearchTrackListSeq()");
      vSearchTabLoading = true;
      tabs_set2Labels('searchTab_info1', 'Clearing...', 'searchTab_info2', 'Clearing...');
      tabs_progBarStart('searchTab_progBar', 'searchTab_progStat1', 'Clearing...', showStrImmed=true);

      vSearchTable.order([]); // remove sorting
      vSearchTable.clear().draw();
      $("#searchTab_info3").text('');
      await searchTab_afClearSearchTrackList();
      await searchTab_afLoadSearchTable();
    }
    catch(err)
    {
      // console.log('__SF__searchTab_afClearSearchTrackListSeq() caught error: ', err);
      tabs_errHandler(err);
    }
    finally
    {
      // console.log('__SF__searchTab_afClearSearchTrackListSeq() finally.');
      vSearchTabLoading = false;
      tabs_progBarStop('searchTab_progBar', 'searchTab_progStat1', '');
    }
  }

  //-----------------------------------------------------------------------------------------------
  function searchTab_LoadSearchParams()
  {
    vCbxTrackNameVal = $('#cbxTrackNameId').is(':checked');
    vCbxArtistNameVal = $('#cbxArtistNameId').is(':checked');
    vCbxAlbumNameVal = $('#cbxAlbumNameId').is(':checked');
    vCbxPlaylistNameVal = $('#cbxPlaylistNameId').is(':checked');
    vCbxDurationHmsVal = $('#cbxDurationHmsId').is(':checked');
    vCbxTrackIdVal = $('#cbxTrackId').is(':checked');

    vSearchText = $(searchTextInput).val();
  }

  //-----------------------------------------------------------------------------------------------
  async function searchTab_afClearSearchTrackList()
  {
    // console.log('__SF__searchTab_afClearSearchTrackList()');

    console.log('__SF__searchTab_afClearSearchTrackList() - vUrl - clearSearchTrackList');
    let response = await fetch(vUrl, {method: 'POST', headers: {'Content-Type': 'application/json',},
                                      body: JSON.stringify({clearSearchTrackList: 'clearSearchTrackList'}),});
    if (!response.ok)
      tabs_throwErrHttp('__SF__searchTab_afClearSearchTrackList()', response.status, 'searchTab_errInfo');
    else
    {
      let reply = await response.json();
      // console.log('__SF__searchTab_afClearSearchTrackList() reply = ', reply);
      if (reply['errRsp'][0] !== 1)
        tabs_throwSvrErr('__SF__searchTab_afClearSearchTrackList()', reply['errRsp'], 'searchTab_errInfo')
    }
  }

  //-----------------------------------------------------------------------------------------------
  function searchTab_cbxEventSearch() { /* make function appear in pycharm structure list */  }
  $('input[type=checkbox][name=cbxSearchFields]').change(function ()
  {
    // clicking on search field cbx will trigger a search
    searchTab_LoadSearchParams();
    if (vCbxTrackNameVal === false & vCbxArtistNameVal === false & vCbxAlbumNameVal === false &
        vCbxPlaylistNameVal === false & vCbxDurationHmsVal === false & vCbxTrackIdVal === false)
    {
      searchTab_afClearSearchTrackListSeq();
      return;
    }

    if (vSearchText === '')
      return

    searchTab_afSearchSeq()
  });

  //-----------------------------------------------------------------------------------------------
  function searchTab_searchTextFieldEvent() { /* make function appear in pycharm structure list */ }
  $("#searchTextInput").on('keyup', function (event)
  {
    // do a search when the user hits enter
    if (event.keyCode === 13)
    {
      vSearchText = $(this).val();
      if (vSearchText != "")
        searchTab_afSearchSeq();
    }
  });

  //-----------------------------------------------------------------------------------------------
  async function searchTab_afSearchSeq()
  {
    try
    {
      console.log('__SF__searchTab_afSearchSeq()');
      vSearchTabLoading = true;
      vSearchTable.clear().draw();


      searchTab_LoadSearchParams();
      if (vCbxTrackNameVal === false & vCbxArtistNameVal === false & vCbxAlbumNameVal === false &
          vCbxPlaylistNameVal === false & vCbxDurationHmsVal === false & vCbxTrackIdVal === false)
      {
        alert('A search field must be selected prior to doing a search.')
        return;
      }

      if (vSearchText === '')
      {
        alert("A search text string must be entered prior to doing a search.");
        return
      }

      // console.log("track = " + vCbxTrackNameVal + ", artist = " + vCbxArtistNameVal + ", album = " + vCbxAlbumNameVal + ", playlist = " + vCbxPlaylistNameVal + ", duration = " + vCbxDurationHmsVal + ", trackId = " + vCbxTrackIdVal);
      // console.log("search text = " + vSearchText);

      // console.log('__SF__searchTab_afSearchSeq() - start loading');
      $("#searchTab_info3").text('');
      tabs_set2Labels('searchTab_info1', 'Loading...', 'searchTab_info2', 'Loading...');
      tabs_progBarStart('searchTab_progBar', 'searchTab_progStat1', 'Searching...', showStrImmed=true);

      await searchTab_afNameSearch();
      await searchTab_afLoadSearchTable();

      // console.log('__SF__searchTab_afSearchSeq() - loading done - exit');
    }
    catch(err)
    {
      tabs_errHandler(err);
    }
    finally
    {
      // console.log('__SF__searchTab_afSearchSeq() finally.');
      vSearchTabLoading = false;
      tabs_progBarStop('searchTab_progBar', 'searchTab_progStat1', '');
    }
  }

  //-----------------------------------------------------------------------------------------------
  async function searchTab_afNameSearch()
  {
    // console.log('__SF__searchTab_afNameSearch()');

    searchTab_LoadSearchParams();

    console.log('__SF__searchTab_afNameSearch() - vUrl - runSearch');
    let response = await fetch(vUrl, { method: 'POST', headers: {'Content-Type': 'application/json',},
                                       body: JSON.stringify({ runSearch: 'runSearch',
                                                              searchText:     vSearchText,
                                                              ckTrackName:    vCbxTrackNameVal,
                                                              ckArtistName:   vCbxArtistNameVal,
                                                              ckAlbumName:    vCbxAlbumNameVal,
                                                              ckPlaylistName: vCbxPlaylistNameVal,
                                                              ckDurationHms:  vCbxDurationHmsVal,
                                                              ckTrackId:      vCbxTrackIdVal }), });
    vSearchText = ''
    if (!response.ok)
      tabs_throwErrHttp('searchTab_afNameSearch()', response.status, 'searchTab_errInfo');
    else
    {
      let reply = await response.json();
      if (reply['errRsp'][0] !== 1)
        tabs_throwSvrErr('searchTab_afNameSearch()', reply['errRsp'], 'searchTab_errInfo')
    }
  }

  //-----------------------------------------------------------------------------------------------
  async function searchTab_afLoadSearchTable()
  {
    // console.log('__SF__searchTab_afLoadSearchTable()');
    console.log('__SF__searchTab_afLoadSearchTable() - vUrl - getSearchTrackList');
    let response = await fetch(vUrl, { method: 'POST', headers: {'Content-Type': 'application/json',},
                                       body: JSON.stringify({ getSearchTrackList: 'getSearchTrackList', modePlayList: vModePlaylist, modeSearch: vModeSearch }), });
    if (!response.ok)
      tabs_throwErrHttp('searchTab_afLoadSearchTable()', response.status, 'searchTab_errInfo');
    else
    {
      let reply = await response.json();
      // console.log('__SF__searchTab_afLoadPlTable() reply = ', reply);
      if (reply['errRsp'][0] !== 1)
        tabs_throwSvrErr('searchTab_afLoadSearchTable()', reply['errRsp'], 'searchTab_errInfo');

      let searchTrackList = reply['searchTrackList'];
      $.each(searchTrackList, function(key, tvals)
      {
        vSearchTable.row.add(['', tvals['Track Name'], tvals['Artist Name'], tvals['Album Name'], tvals['Playlist Name'],
                                  tvals['Duration Hms'], tvals['Track Position'], tvals['Playlist Owners Name'], tvals['Track Id'],
                                  tvals['Playlist Id'], tvals['Track Uri'], tvals['Playlist Owners Id'] ]);
      });
      vSearchTable.draw();

      plSelectedDict = reply['plSelectedDict']
      nSelectedPl = Object.keys(plSelectedDict).length;

      searchTab_updateSelectedCnt();
      let infoStr2 = 'Tracks Found: ' + reply['numSearchMatches'] + '&nbsp &nbsp &nbsp in ' + nSelectedPl + ' Selected Playlists ' + ' with ' + reply['numTracksInSelectedPl'] + ' Tracks';
      tabs_setLabel('searchTab_info2', infoStr2);

      $.each(plSelectedDict, function (key, item)
      {
        if (item['Playlist Owners Id'] === vUserId)
        {
          idNm = key + '::::' + item['Playlist Name']
          // console.log('__SF__tracksTab_afLoadPlNameTable() - userPl = \n' + key + ', ' + item['Playlist Name']);
          plNm = item['Playlist Name']
          if (plNm.length > 44)
            plNm = plNm.slice(0, 44) + '...'
          $('#searchTab_cbMvCpDest').append($('<option>', {value: idNm, text: plNm}));
        }
      });

      vShowNoMatchesFound = true;
      searchTab_LoadSearchParams();
      if (vCbxTrackNameVal === false & vCbxArtistNameVal === false & vCbxAlbumNameVal === false &
          vCbxPlaylistNameVal === false & vCbxDurationHmsVal === false & vCbxTrackIdVal === false)
        vShowNoMatchesFound = false;
      else if (vSearchText === '')
        vShowNoMatchesFound = false;
      else if (reply['numSearchMatches'] > 0)
        vShowNoMatchesFound = false;

      if (vShowNoMatchesFound)
      {
        msg = 'No matches found in selected playlists.';
        $("#searchTab_info3").text(msg);
      }
    }
  }

  //-----------------------------------------------------------------------------------------------
  function searchTab_searchTableSelect() { /* make function appear in pycharm structure list */ }
  $('#searchTable').on( 'select.dt', function ( e, dt, type, indexes )
  {
    searchTab_updateSelectedCnt();
  });

  //-----------------------------------------------------------------------------------------------
  function searchTab_searchTableDeselect() { /* make function appear in pycharm structure list */ }
  $('#searchTable').on( 'deselect.dt', function ( e, dt, type, indexes )
  {
    searchTab_updateSelectedCnt();
  });

  //-----------------------------------------------------------------------------------------------
  function searchTab_btnClearSearchPlOnClick()
  {
    //console.log('__SF__searchTab_btnClearSearchPlOnClick()');
    // clear search boxes under pl table
    $("input[name^='searchColSearchIB']").each(function()
    {
      // for unknown reasons there are 12 instead of 6 input search boxes. clear them all...ugh
      $(this).val('');   // this = dom element  // $(this) = dom element in a jquery wrapper so val() is available
      $(this).keyup();
    });

    // last element edited gets focus
    let searchInputBox = $('input[name="'+vSearchTableLastSearchCol+'"]');
    searchInputBox.focus();
  }

  //-----------------------------------------------------------------------------------------------
  function searchTab_updateSelectedCnt()
  {
    //console.log('__SF__artistsTab_updateSelectedCnt()');
    let count = vSearchTable.rows({ selected: true }).count();
    tabs_setLabel('searchTab_info1', 'Selected Tracks: ' + count);
  }

  //-----------------------------------------------------------------------------------------------
  async function searchTab_afRmTracksSeq()
  {
    try
    {
      // console.log('__SF__searchTab_afRmTracksSeq()');
      vSearchTabLoading = true;

      tabs_progBarStart('searchTab_progBar', 'searchTab_progStat1', 'Removing Tracks...', showStrImmed=true);

      let rmTrackList = [];
      let rowData;
      $.each(vSearchTable.rows('.selected').nodes(), function (i, item)
      {
        rowData = vSearchTable.row(this).data();
        rmTrackList.push({'Playlist Id': rowData[9], 'Track Uri': rowData[10], 'Track Position': parseInt(rowData[3])});
      });

      if (Object.keys(rmTrackList).length === 0)
        return;

      vSearchTable.clear();//.draw(); draw causes annoying flash
      // console.log('__SF__searchTab_afRmTracksSeq() rmTrackList: rowData = \n' + JSON.stringify(rmTrackList, null, 4));
      await tabs_afRemoveTracks(rmTrackList);
      vSearchTable.clear();
      await searchTab_afSearchSeq();
    }
    catch(err)
    {
      // console.log('__SF__plTab_afActivate() caught error: ', err);
      tabs_errHandler(err);
    }
    finally
    {
      // console.log('__SF__searchTab_afRmTracksSeq() finally.');
      vSearchTabLoading = false;
      tabs_progBarStop('searchTab_progBar', 'searchTab_progStat1', '');
    }
  }

  //-----------------------------------------------------------------------------------------------
  function searchTab_btnSearch()
  {
    // console.log('__SF__searchTab_btnSearch()');
    searchTab_afSearchSeq();
  }

  //-----------------------------------------------------------------------------------------------
  function searchTab_btnSearchClear()
  {
    console.log('__SF__searchTab_btnSearchClear()');
    vSearchTable.clear().draw();
  }

  //-----------------------------------------------------------------------------------------------
  function searchTab_btnRemoveTracks()
  {
    // console.log('__SF__searchTab_btnRemoveTracks()');
    searchTab_afRmTracksSeq();
  }

  //-----------------------------------------------------------------------------------------------
  function searchTab_btnRefresh()
  {
    // console.log('__SF__searchTab_btnRefresh()');
    searchTab_btnClearSearchPlOnClick();
    searchTab_afLoadSearchTableSeq();
  }

  //-----------------------------------------------------------------------------------------------
  function searchTab_btnHelp()
  {
    // console.log('__SF__searchTab_btnHelp()');
    vHtmlInfoFn = 'helpTextTabSearch.html';
    $("#btnInfoTab")[0].click();
  }
