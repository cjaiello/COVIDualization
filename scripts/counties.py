import json

data = {}
with open('countiesGeoJson.json') as f:
  data = json.load(f)

counties = data["features"]

statesToCounties = {}
# https://www.mcc.co.mercer.pa.us/dps/state_fips_code_listing.htm
for county in counties:
    print county
    stateId = county['properties']['STATE']
    if (stateId in statesToCounties):
        myArray = []
        myArray.append(statesToCounties[stateId])
        myArray.append(county)
        statesToCounties[stateId] = myArray
    else:
        statesToCounties[stateId] = [county]


fipsToStateCodes = {
    "02" : "AK",
    "01" : "AL",
    "05" : "AR",
    "60" : "AS",
    "04" : "AZ",
    "06" : "CA",
    "08" : "CO",
    "09" : "CT",
    "11" : "DC",
    "10" : "DE",
    "12" : "FL",
    "13" : "GA",
    "66" : "GU",
    "15" : "HI",
    "19" : "IA",
    "16" : "ID",
    "17" : "IL",
    "18" : "IN",
    "20" : "KS",
    "21" : "KY",
    "22" : "LA",
    "25" : "MA",
    "24" : "MD",
    "23" : "ME",
    "26" : "MI",
    "27" : "MN",
    "29" : "MO",
    "28" : "MS",
    "30" : "MT",
    "37" : "NC",
    "38" : "ND",
    "31" : "NE",
    "33" : "NH",
    "34" : "NJ",
    "35" : "NM",
    "32" : "NV",
    "36" : "NY",
    "39" : "OH",
    "40" : "OK",
    "41" : "OR",
    "42" : "PA",
    "72" : "PR",
    "44" : "RI",
    "45" : "SC",
    "46" : "SD",
    "47" : "TN",
    "48" : "TX",
    "49" : "UT",
    "51" : "VA",
    "78" : "VI",
    "50" : "VT",
    "53" : "WA",
    "55" : "WI",
    "54" : "WV",
    "56" : "WY"
}

for state in statesToCounties:
    stateAbbreviation = fipsToStateCodes[state].lower()
    with open(stateAbbreviation + "-counties.txt", 'w') as outfile:
        json.dump(statesToCounties[state], outfile)
    