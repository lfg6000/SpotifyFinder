  var vDupsTable;
  var vLastPlSelectionCntrDupsTab = 0;
  var vDupsTableLastSearchCol = '';
  var vDupsTabLoading = false;

  var vModePlaylist = 'Same'  // 'Across' or 'Same'
  var vModeSearch = 'Track Id'  // 'Track Id' or 'Nad' = TrackName/ArtistName/Duration

  //-----------------------------------------------------------------------------------------------
  function dupsTab_initPlTab(tableHeight=300)
  {
    console.log("dupsTab_initPlTab() - dupsTable ready()");

    // must be before table creation
    // add search input boxes to the dom at the bottom of the desired columns
    let ftIdx = 0;
    $('#dupsTable tfoot th').each(function()
    {
      if (ftIdx === 0)
      {
        $(this).html('<button onclick="dupsTab_btnClearSearchPlOnClick()" class="btnClrSearch" title="Clear search">x</button>');
      }
      if (ftIdx !== 0)
      {
        let ibName = 'dupsColSearchIB' + ftIdx;
        $(this).html('<input type="text" name="' + ibName + '" placeholder="Search"/>');
      }
      ftIdx += 1;
    } );

    vDupsTable = $('#dupsTable').DataTable(
    {
      "fnRowCallback": function(nRow, rowData)
      {
          if (rowData[11] === 1)
          { $('td', nRow).addClass('clrDup'); }

          if (rowData[12] != vUserId)   // playlistOwnerId != vUserId
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
              vDupsTableLastSearchCol = this.name;
              that.search(this.value)
              that.draw();
            }
          });
        });
      },

      // dom default: lfrtip; ('r', 't' provides processing, table) (no 'f, 'p', 'i' removes search btn, paging info)
      "dom":            "rt",
      "scrollY":         tableHeight - 14,  // compensate for extra height for radio btns that the other tabs do not have
      "scrollCollapse":  false,
      "paging":          false,
      "orderClasses":    false, // background color of sorted column does not change
      "order":           [],
      columnDefs: [ { targets:  0, className: 'select-checkbox', orderable: false },
                    { targets:  9, visible: false, searchable: false },
                    { targets: 10, visible: false, searchable: false },
                    { targets: 11, visible: false, searchable: false },
                    { targets: 12, visible: false, searchable: false } ],
      select: { style: 'multi' }
    });
  }

  //-----------------------------------------------------------------------------------------------
  function dupsTab_redraw()
  {
    console.log('dupsTab_redraw()');
    vDupsTable.columns.adjust().draw();
  }

  //-----------------------------------------------------------------------------------------------
  async function dupsTab_afActivate(curPlSelectionCntr)
  {
    try
    {
      // console.log('dupsTab_activate()');
      console.log('dupsTab_activate() - lastCnt = ' + vLastPlSelectionCntrDupsTab + ', curCnt = ' + curPlSelectionCntr);
      if (vLastPlSelectionCntrDupsTab !== curPlSelectionCntr)
      {
        vLastPlSelectionCntrDupsTab = curPlSelectionCntr;
        vDupsTabLoading = true;

        // this works better if the clear tables are here instead of being inside async calls
        // we are reloading both tables so we empty them out
        vDupsTable.clear().draw();

        console.log('dupsTab_afActivate() - start loading');
        tabs_set2Labels('dupsTab_info1', 'Loading', 'dupsTab_info2', 'Loading');
        tabs_progBarStart('dupsTab_progBar', 'dupsTab_progStat1', 'Finding Duplicates...', showStrImmed=true);

        await tracksTab_afLoadPlTracks();
        await dupsTab_afFindDups();
        await dupsTab_afLoadDupsTable();

        console.log('dupsTab_afActivate() - loading done - exit');
      }
    }
    catch(err)
    {
      // console.log('dupsTab_afActivate() caught error: ', err);
      tabs_errHandler(err);
    }
    finally
    {
      console.log('dupsTab_afActivate() finally.');
      vDupsTabLoading = false;
      tabs_progBarStop('dupsTab_progBar', 'dupsTab_progStat1', '');
    }
  }

  //-----------------------------------------------------------------------------------------------
  async function dupsTab_afLoadDupsTableSeq()
  {
    try
    {
      console.log("dupsTab_afLoadDupsTableSeq()");
      vDupsTabLoading = true;
      tabs_set2Labels('dupsTab_info1', 'Loading...', 'dupsTab_info2', 'Loading...');
      tabs_progBarStart('dupsTab_progBar', 'dupsTab_progStat1', 'Finding Duplicates...', showStrImmed=true);

      vDupsTable.order([]); // remove sorting
      vDupsTable.clear().draw();
      await dupsTab_afLoadDupsTable();
    }
    catch(err)
    {
      // console.log('dupsTab_afLoadDupsTableSeq() caught error: ', err);
      tabs_errHandler(err);
    }
    finally
    {
      console.log('dupsTab_afLoadDupsTableSeq() finally.');
      vDupsTabLoading = false;
      tabs_progBarStop('dupsTab_progBar', 'dupsTab_progStat1', '');
    }
  }

  //-----------------------------------------------------------------------------------------------
  function dupsTab_radioBtnEventMode() { /* make function appear in pycharm structure list */ }
  $('input[type=radio][name=rPlMode]').change(function()
  {
    dupsTab_afFindDupsSeq();
  });

  //-----------------------------------------------------------------------------------------------
  function dupsTab_radioBtnEventSearch() { /* make function appear in pycharm structure list */ }
  $('input[type=radio][name=rPlSearch]').change(function()
  {
    dupsTab_afFindDupsSeq()
  });

  //-----------------------------------------------------------------------------------------------
  async function dupsTab_afFindDupsSeq()
  {
    try
    {
      console.log('dupsTab_afFindDupsSeq()');
      vDupsTabLoading = true;
      vDupsTable.clear().draw();

      console.log('dupsTab_afFindDupsSeq() - start loading');
      tabs_set2Labels('dupsTab_info1', 'Loading', 'dupsTab_info2', 'Loading');
      tabs_progBarStart('dupsTab_progBar', 'dupsTab_progStat1', 'Finding Duplicates...', showStrImmed=true);

      await dupsTab_afFindDups();
      await dupsTab_afLoadDupsTable();

      console.log('dupsTab_afFindDupsSeq() - loading done - exit');
    }
    catch(err)
    {
      // console.log('dupsTab_afActivate() caught error: ', err);
      tabs_errHandler(err);
    }
    finally
    {
      console.log('dupsTab_afFindDupsSeq() finally.');
      vDupsTabLoading = false;
      tabs_progBarStop('dupsTab_progBar', 'dupsTab_progStat1', '');
    }
  }

  //-----------------------------------------------------------------------------------------------
  async function dupsTab_afFindDups()
  {
    // var vModePlaylist = 'Across'  // or 'Same'
    // var vModeSearch = 'Track Id'  // or 'Nad' = TrackName/ArtistName/Duration

    // console.log('dupsTab_afFindDups()');

    vModePlaylist = $("input[name='rPlMode']:checked").val();
    vModeSearch = $("input[name='rPlSearch']:checked").val();
    console.log('dupsTab_afFindDups() - radio btn values vModePlaylist = ' + vModePlaylist + ', vModeSearch = ' + vModeSearch)

    console.log('dupsTab_afFindDups() - vUrl - findDups');
    let response = await fetch(vUrl, { method: 'POST', headers: {'Content-Type': 'application/json',},
                                       body: JSON.stringify({ findDups: 'FindDups', modePlaylist: vModePlaylist, modeSearch: vModeSearch }), });
    if (!response.ok)
      tabs_throwErrHttp('dupsTab_afFindDups()', response.status, 'dupsTab_errInfo');
    else
    {
      let reply = await response.json();
      // console.log('dupsTab_afLoadPlDict() reply = ', reply);
      if (reply['errRsp'][0] !== 1)
        tabs_throwSvrErr('dupsTab_afFindDups()', reply['errRsp'], 'dupsTab_errInfo')
    }
  }

  //-----------------------------------------------------------------------------------------------
  async function dupsTab_afLoadDupsTable()
  {
    // console.log('dupsTab_afLoadDupsTable()');
    console.log('dupsTab_afLoadPlTable() - vUrl - getDupsTrackList');
    let response = await fetch(vUrl, { method: 'POST', headers: {'Content-Type': 'application/json',},
                                       body: JSON.stringify({ getDupsTrackList: 'getDupsTrackList', modePlayList: vModePlaylist, modeSearch: vModeSearch }), });
    if (!response.ok)
      tabs_throwErrHttp('dupsTab_afLoadDupsTable()', response.status, 'dupsTab_errInfo');
    else
    {
      let reply = await response.json();
      // console.log('dupsTab_afLoadPlTable() reply = ', reply);
      if (reply['errRsp'][0] !== 1)
        tabs_throwSvrErr('dupsTab_afLoadDupsTable()', reply['errRsp'], 'dupsTab_errInfo')

      let idx = 0;
      let dupsTrackList = reply['dupsTrackList'];
      let dupsClrList = reply['dupsClrList'];
      $.each(dupsTrackList, function(key, tvals)
      {
        vDupsTable.row.add(['', tvals['Track Name'], tvals['Playlist Name'], tvals['Track Position'], tvals['Artist Name'],
                                tvals['Album Name'], tvals['Duration Hms'], tvals['Playlist Owners Name'], tvals['Track Id'],
                                tvals['Playlist Id'], tvals['Track Uri'], dupsClrList[idx], tvals['Playlist Owners Id'] ]);
        idx++;
      });
      vDupsTable.draw();

      dupsTab_updateSelectedCnt();
      let infoStr2 = 'Duplicates in Selected Playlists: ' + reply['numDupsMatch'];
      tabs_setLabel('dupsTab_info2', infoStr2);
    }
  }

  //-----------------------------------------------------------------------------------------------
  function dupsTab_dupsTableRow_onUserSelect() { /* make function appear in pycharm structure list */ }
  $('#dupsTable').on('user-select.dt', function (e, dt, type, cell, originalEvent)
  {
    rowData = vDupsTable.row(cell.node()).data()
    // let rowData = vPlTracksTable.row(indexes).data();
    // console.log('dupsTab_dupsTableRow_onUserSelect(): rowData = \n' + JSON.stringify(rowData, null, 4));
    if (rowData[12] != vUserId)    // playlistOwnerId != vUserId
    {
       e.preventDefault();
       $("#dupsTab_info3").text("Track can not be selected/removed since you are not the playlist owner.");
       setTimeout(function() { $("#dupsTab_info3").text(''); }, 4500);
       return;
    }

    dupsTab_updateSelectedCnt();
  });

  //-----------------------------------------------------------------------------------------------
  function dupsTab_dupsTableSelect() { /* make function appear in pycharm structure list */ }
  $('#dupsTable').on( 'select.dt', function ( e, dt, type, indexes )
  {
    dupsTab_updateSelectedCnt();
  });

  //-----------------------------------------------------------------------------------------------
  function dupsTab_dupsTableDeselect() { /* make function appear in pycharm structure list */ }
  $('#dupsTable').on( 'deselect.dt', function ( e, dt, type, indexes )
  {
    dupsTab_updateSelectedCnt();
  });

  //-----------------------------------------------------------------------------------------------
  function dupsTab_btnClearSearchPlOnClick()
  {
    //console.log('dupsTab_btnClearSearchPlOnClick()');
    // clear search boxes under pl table
    $("input[name^='dupsColSearchIB']").each(function()
    {
      // for unknown reasons there are 12 instead of 6 input search boxes. clear them all...ugh
      $(this).val('');   // this = dom element  // $(this) = dom element in a jquery wrapper so val() is available
      $(this).keyup();
    });

    // last element edited gets focus
    let searchInputBox = $('input[name="'+vDupsTableLastSearchCol+'"]');
    searchInputBox.focus();
  }

  //-----------------------------------------------------------------------------------------------
  function dupsTab_updateSelectedCnt()
  {
    //console.log('artistsTab_updateSelectedCnt()');
    let count = vDupsTable.rows({ selected: true }).count();
    tabs_setLabel('dupsTab_info1', 'Selected Tracks: ' + count);
  }

  //-----------------------------------------------------------------------------------------------
  async function dupsTab_afRmTracksSeq()
  {
    try
    {
      console.log('dupsTab_afRmTracksSeq()');
      vDupsTabLoading = true;

      tabs_progBarStart('dupsTab_progBar', 'dupsTab_progStat1', 'Removing Tracks...', showStrImmed=true);

      let rmTrackList = [];
      let rowData;
      $.each(vDupsTable.rows('.selected').nodes(), function (i, item)
      {
        rowData = vDupsTable.row(this).data();
        rmTrackList.push({'Playlist Id': rowData[9], 'Track Uri': rowData[10], 'Track Position': parseInt(rowData[3])});
      });

      if (Object.keys(rmTrackList).length < 0)
        return

      vDupsTable.clear();//.draw(); draw causes annoying flash
      console.log('dupsTab_afRmTracksSeq() rmTrackList: rowData = \n' + JSON.stringify(rmTrackList, null, 4));
      await tabs_afRemoveTracks(rmTrackList);
      vDupsTable.clear();
      await dupsTab_afFindDups();
      await dupsTab_afLoadDupsTable();
    }
    catch(err)
    {
      // console.log('plTab_afActivate() caught error: ', err);
      tabs_errHandler(err);
    }
    finally
    {
      console.log('dupsTab_afRmTracksSeq() finally.');
      vDupsTabLoading = false;
      tabs_progBarStop('dupsTab_progBar', 'dupsTab_progStat1', '');
    }
  }

  //-----------------------------------------------------------------------------------------------
  function dupsTab_btnRemoveTracks()
  {
    console.log('dupsTab_btnRemoveTracks()');
    dupsTab_afRmTracksSeq();
  }

  //-----------------------------------------------------------------------------------------------
  function dupsTab_btnRefresh()
  {
    console.log('dupsTab_btnRefresh()');
    dupsTab_afLoadDupsTableSeq();
  }

  //-----------------------------------------------------------------------------------------------
  function dupsTab_btnHelp()
  {
    // console.log('dupsTab_btnHelp()');
    vHtmlInfoFn = 'helpTextTabDups.html';
    $("#btnInfoTab")[0].click();
  }

  //-----------------------------------------------------------------------------------------------
  // function dupsTab_btnCoffee()
  // {
  //   console.log('plTabs_btnCoffee()');
  //   vHtmlInfoFn = 'helpTextCoffee.html';
  //   $("#btnInfoTab")[0].click();
  // }